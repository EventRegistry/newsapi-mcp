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
  it("lists all tools including non-core at startup", async () => {
    const result = await client.listTools();
    const names = result.tools.map((t) => t.name).sort();

    // All tools registered at startup for client visibility
    expect(names).toContain("search_articles");
    expect(names).toContain("search_events");
    expect(names).toContain("suggest_concepts");
    expect(names).toContain("get_api_usage");
    expect(names).toContain("list_available_tools");
    expect(names).toContain("enable_toolset");
    // Non-core tools also listed
    expect(names).toContain("get_article_details");
    expect(names).toContain("suggest_authors");
    expect(names).toContain("get_topic_page_articles");
  });

  it("returns error when calling disabled non-core tool", async () => {
    // suggest_authors is non-core and not enabled by default
    const result = await client.callTool({
      name: "suggest_authors",
      arguments: { prefix: "Test" },
    });

    expect(result.isError).toBe(true);
    const content = result.content[0] as { text: string };
    expect(content.text).toContain("not enabled");
    expect(content.text).toContain("enable_toolset");
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

  it("enable_toolset enables non-core tools in category", async () => {
    const result = await client.callTool({
      name: "enable_toolset",
      arguments: { category: "search", enabled: true },
    });

    const content = result.content[0] as { text: string };
    expect(content.text).toContain("get_article_details");
    expect(content.text).toContain("get_event_details");
    expect(content.text).toContain("find_event_for_text");

    // Non-core tool should now work (mock the API call)
    mockFetchOk({ uri: "test", info: {} });
    const detailResult = await client.callTool({
      name: "get_article_details",
      arguments: { articleUri: "12345" },
    });
    expect(detailResult.isError).toBeFalsy();
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
    expect(content.text).toContain("Disabled");

    // Non-core tools should return error when called
    const detailResult = await client.callTool({
      name: "get_article_details",
      arguments: { articleUri: "12345" },
    });
    expect(detailResult.isError).toBe(true);
    const detailContent = detailResult.content[0] as { text: string };
    expect(detailContent.text).toContain("not enabled");

    // Core tools should still work
    mockFetchOk({ articles: { results: [] } });
    const searchResult = await client.callTool({
      name: "search_articles",
      arguments: { keyword: "test" },
    });
    expect(searchResult.isError).toBeFalsy();
  });

  it("enable_toolset works for topic_pages (no core tools)", async () => {
    // Before enabling, calling should return error
    const beforeResult = await client.callTool({
      name: "get_topic_page_articles",
      arguments: { uri: "test-uri" },
    });
    expect(beforeResult.isError).toBe(true);

    // Enable
    await client.callTool({
      name: "enable_toolset",
      arguments: { category: "topic_pages", enabled: true },
    });

    // After enabling, tool should work
    mockFetchOk({ articles: { results: [] } });
    const afterResult = await client.callTool({
      name: "get_topic_page_articles",
      arguments: { uri: "test-uri" },
    });
    expect(afterResult.isError).toBeFalsy();

    // Disable
    await client.callTool({
      name: "enable_toolset",
      arguments: { category: "topic_pages", enabled: false },
    });

    // After disabling, should return error again
    const disabledResult = await client.callTool({
      name: "get_topic_page_articles",
      arguments: { uri: "test-uri" },
    });
    expect(disabledResult.isError).toBe(true);
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
