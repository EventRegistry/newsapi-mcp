import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { z } from "zod";
import { initClient } from "../src/client.js";
import { allTools } from "../src/tools/index.js";

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

  // Register all tools (same logic as index.ts)
  for (const tool of allTools) {
    const shape: Record<string, z.ZodTypeAny> = {};
    const props = tool.inputSchema.properties;
    const required = new Set(tool.inputSchema.required ?? []);

    for (const [key, schemaDef] of Object.entries(props)) {
      const def = schemaDef as Record<string, unknown>;
      let field: z.ZodTypeAny;

      const typeDef = def.type;
      if (
        typeDef === "integer" ||
        typeDef === "number" ||
        (Array.isArray(typeDef) && typeDef.includes("number"))
      ) {
        field = z.number();
      } else if (typeDef === "boolean") {
        field = z.boolean();
      } else if (Array.isArray(typeDef) && typeDef.includes("object")) {
        field = z.any();
      } else {
        field = z.string();
      }

      if (def.description) {
        field = field.describe(def.description as string);
      }

      if (def.enum && Array.isArray(def.enum)) {
        const values = def.enum as string[];
        if (values.length > 0) {
          field = z
            .enum(values as [string, ...string[]])
            .describe((def.description as string) || "");
        }
      }

      if (!required.has(key)) {
        field = field.optional();
      }

      shape[key] = field;
    }

    const handler = tool.handler;
    server.tool(
      tool.name,
      tool.description,
      z.object(shape).shape,
      async (params) => {
        try {
          const result = await handler(
            params as unknown as Record<string, unknown>,
          );
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            content: [{ type: "text" as const, text: message }],
            isError: true,
          };
        }
      },
    );
  }

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
  it("lists all 23 tools", async () => {
    const result = await client.listTools();
    expect(result.tools).toHaveLength(23);

    const names = result.tools.map((t) => t.name).sort();
    expect(names).toContain("search_articles");
    expect(names).toContain("suggest_concepts");
    expect(names).toContain("annotate_text");
    expect(names).toContain("get_api_usage");
  });

  it("calls suggest_concepts and returns text content", async () => {
    mockFetchOk([
      { uri: "http://en.wikipedia.org/wiki/Tesla", label: "Tesla" },
    ]);

    const result = await client.callTool({
      name: "suggest_concepts",
      arguments: { prefix: "Tesla" },
    });

    expect(result.content).toHaveLength(1);
    const content = result.content[0];
    expect(content).toMatchObject({ type: "text" });
    const parsed = JSON.parse((content as { text: string }).text);
    expect(parsed).toEqual([
      { uri: "http://en.wikipedia.org/wiki/Tesla", label: "Tesla" },
    ]);
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

  it("sends lang=eng in suggest_locations when lang not provided", async () => {
    mockFetchOk([
      { uri: "http://en.wikipedia.org/wiki/Berlin", label: "Berlin" },
    ]);

    await client.callTool({
      name: "suggest_locations",
      arguments: { prefix: "Berlin" },
    });

    const lastCall = fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1];
    const body = JSON.parse(lastCall[1].body);
    expect(body).toHaveProperty("lang", "eng");
    expect(body).toHaveProperty("prefix", "Berlin");
  });

  it("calls analytics tool via correct base URL", async () => {
    mockFetchOk({ sentiment: 0.8 });

    await client.callTool({
      name: "analyze_sentiment",
      arguments: { text: "Great news!" },
    });

    const url = fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1][0];
    expect(url).toContain("analytics.eventregistry.org");
    expect(url).toContain("/sentiment");
  });
});
