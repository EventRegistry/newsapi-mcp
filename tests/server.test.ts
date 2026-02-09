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
  it("lists all tools", async () => {
    const result = await client.listTools();
    const names = result.tools.map((t) => t.name).sort();

    expect(names).toHaveLength(13);
    expect(names).toContain("search_articles");
    expect(names).toContain("search_events");
    expect(names).toContain("suggest_concepts");
    expect(names).toContain("get_api_usage");
    expect(names).toContain("get_article_details");
    expect(names).toContain("suggest_authors");
    expect(names).toContain("get_topic_page_articles");
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
    const content = result.content[0] as { type: string; text: string };
    expect(content).toMatchObject({ type: "text" });
    // Formatter always runs now — empty results return text message
    expect(content.text).toBe("No articles found.");

    // Verify fetch was called with the right endpoint
    const url = fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1][0];
    expect(url).toContain("/article/getArticles");
  });

  it("wraps errors with isError flag and recovery guidance", async () => {
    mockFetchError(403, '{"error":"forbidden"}');

    const result = await client.callTool({
      name: "get_api_usage",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    const content = result.content[0] as { text: string };
    expect(content.text).toContain("Authentication failed");
    expect(content.text).toContain("NEWSAPI_KEY");
  });

  it("returns rate limit guidance for 429", async () => {
    mockFetchError(429, '"quota exceeded"');

    const result = await client.callTool({
      name: "search_articles",
      arguments: { keyword: "test" },
    });

    expect(result.isError).toBe(true);
    const content = result.content[0] as { text: string };
    expect(content.text).toContain("Rate limited");
    expect(content.text).toContain("next day");
  });

  it("returns param suggestions for 400 with known param", async () => {
    mockFetchError(400, '{"error":"invalid lang value"}');

    const result = await client.callTool({
      name: "search_articles",
      arguments: { keyword: "test" },
    });

    expect(result.isError).toBe(true);
    const content = result.content[0] as { text: string };
    expect(content.text).toContain("Invalid request");
    expect(content.text).toContain('Valid values for "lang"');
  });

  it("appends warnings for invalid includeFields", async () => {
    mockFetchOk({ articles: { results: [] } });

    const result = await client.callTool({
      name: "search_articles",
      arguments: { keyword: "AI", includeFields: "sentiment,bogus" },
    });

    expect(result.isError).toBeUndefined();
    const content = result.content[0] as { text: string };
    expect(content.text).toContain("bogus");
    expect(content.text).toContain("ignored");
  });

  it("handles network errors gracefully", async () => {
    fetchSpy.mockRejectedValue(new Error("fetch failed"));

    const result = await client.callTool({
      name: "get_api_usage",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    const content = result.content[0] as { text: string };
    expect(content.text).toContain("Network/unexpected error");
    expect(content.text).toContain("fetch failed");
  });
});
