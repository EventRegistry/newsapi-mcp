import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { initClient } from "../src/client.js";
import { allTools, ToolRegistry } from "../src/tools/index.js";

// Mock fetch globally so no real HTTP requests are made
const fetchSpy = vi.fn();
vi.stubGlobal("fetch", fetchSpy);

function mockFetchOk(data: unknown) {
  fetchSpy.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

function mockFetchError(status: number, body: string) {
  fetchSpy.mockResolvedValue({
    ok: false,
    status,
    text: () => Promise.resolve(body),
  });
}

let client: Client;
let server: McpServer;

beforeAll(async () => {
  initClient("test-key");

  server = new McpServer({ name: "newsapi", version: "1.0.0" });

  const registry = new ToolRegistry(allTools);
  registry.attach(server);

  // Connect via in-memory transport
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  client = new Client({ name: "test-client", version: "1.0.0" });

  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);
});

afterAll(async () => {
  await client.close();
  await server.close();
});

describe("MCP server E2E", () => {
  it("lists only core tools + meta tools by default", async () => {
    const result = await client.listTools();
    const names = result.tools.map((t) => t.name).sort();

    // Core: search_articles, search_events, suggest_concepts, get_api_usage
    // Meta: list_available_tools, enable_toolset
    expect(names).toEqual([
      "enable_toolset",
      "get_api_usage",
      "list_available_tools",
      "search_articles",
      "search_events",
      "suggest_concepts",
    ]);
    expect(result.tools).toHaveLength(6);
  });

  it("does not expose non-core tools by default", async () => {
    const result = await client.listTools();
    const names = result.tools.map((t) => t.name);

    expect(names).not.toContain("get_article_details");
    expect(names).not.toContain("suggest_authors");
    expect(names).not.toContain("get_topic_page_articles");
  });

  it("list_available_tools shows all categories", async () => {
    const result = await client.callTool({
      name: "list_available_tools",
      arguments: {},
    });

    const content = result.content[0] as { text: string };
    const info = JSON.parse(content.text);

    expect(info).toHaveLength(4);
    const categories = info.map((c: { category: string }) => c.category).sort();
    expect(categories).toEqual(["search", "suggest", "topic_pages", "usage"]);

    // Check search category has correct split
    const search = info.find(
      (c: { category: string }) => c.category === "search",
    );
    expect(search.enabled).toContain("search_articles");
    expect(search.enabled).toContain("search_events");
    expect(search.disabled).toContain("get_article_details");
    expect(search.disabled).toContain("get_event_details");
    expect(search.disabled).toContain("find_event_for_text");
  });

  it("enable_toolset adds all tools in category", async () => {
    const result = await client.callTool({
      name: "enable_toolset",
      arguments: { category: "search", enabled: true },
    });

    const content = result.content[0] as { text: string };
    expect(content.text).toContain("get_article_details");
    expect(content.text).toContain("get_event_details");
    expect(content.text).toContain("find_event_for_text");

    // Verify tools now appear in listing
    const tools = await client.listTools();
    const names = tools.tools.map((t) => t.name);
    expect(names).toContain("get_article_details");
    expect(names).toContain("get_event_details");
    expect(names).toContain("find_event_for_text");
  });

  it("enable_toolset can disable non-core tools", async () => {
    // First ensure search is fully enabled
    await client.callTool({
      name: "enable_toolset",
      arguments: { category: "search", enabled: true },
    });

    // Now disable
    const result = await client.callTool({
      name: "enable_toolset",
      arguments: { category: "search", enabled: false },
    });

    const content = result.content[0] as { text: string };
    expect(content.text).toContain("removed");

    // Core tools should still be there
    const tools = await client.listTools();
    const names = tools.tools.map((t) => t.name);
    expect(names).toContain("search_articles");
    expect(names).toContain("search_events");
    // Non-core should be gone
    expect(names).not.toContain("get_article_details");
    expect(names).not.toContain("find_event_for_text");
  });

  it("enable_toolset works for topic_pages (no core tools)", async () => {
    // Enable
    await client.callTool({
      name: "enable_toolset",
      arguments: { category: "topic_pages", enabled: true },
    });

    let tools = await client.listTools();
    let names = tools.tools.map((t) => t.name);
    expect(names).toContain("get_topic_page_articles");
    expect(names).toContain("get_topic_page_events");

    // Disable
    await client.callTool({
      name: "enable_toolset",
      arguments: { category: "topic_pages", enabled: false },
    });

    tools = await client.listTools();
    names = tools.tools.map((t) => t.name);
    expect(names).not.toContain("get_topic_page_articles");
    expect(names).not.toContain("get_topic_page_events");
  });

  it("calls suggest_concepts and returns formatted text", async () => {
    mockFetchOk([
      { uri: "http://en.wikipedia.org/wiki/Tesla", label: "Tesla" },
    ]);

    const result = await client.callTool({
      name: "suggest_concepts",
      arguments: { prefix: "Tesla" },
    });

    expect(result.content).toHaveLength(1);
    const content = result.content[0] as { type: string; text: string };
    expect(content.type).toBe("text");
    // Suggest tools always use their formatter (JSONL output)
    const parsed = JSON.parse(content.text);
    expect(parsed).toMatchObject({
      label: "Tesla",
      uri: "http://en.wikipedia.org/wiki/Tesla",
    });
  });

  it("calls search_articles with keyword", async () => {
    mockFetchOk({ articles: { results: [] } });

    const result = await client.callTool({
      name: "search_articles",
      arguments: { keyword: "AI" },
    });

    expect(result.content).toHaveLength(1);
    const content = result.content[0];
    expect(content).toMatchObject({ type: "text" });

    // Verify fetch was called with the right endpoint
    const url = fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1][0];
    expect(url).toContain("/article/getArticles");
  });

  it("wraps errors with isError flag", async () => {
    mockFetchError(403, '{"error":"forbidden"}');

    const result = await client.callTool({
      name: "get_api_usage",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    const content = result.content[0] as { text: string };
    expect(content.text).toContain("403");
  });
});
