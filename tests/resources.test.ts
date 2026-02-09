import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { initClient } from "../src/client.js";
import { serverInstructions } from "../src/instructions.js";
import { registerResources } from "../src/resources.js";
import { allTools, ToolRegistry } from "../src/tools/index.js";

// Mock fetch globally so no real HTTP requests are made
vi.stubGlobal(
  "fetch",
  vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }),
);

let client: Client;
let server: McpServer;

beforeAll(async () => {
  initClient("test-key");

  server = new McpServer(
    { name: "newsapi", version: "1.0.0" },
    { instructions: serverInstructions },
  );

  const registry = new ToolRegistry(allTools);
  registry.attach(server);
  registerResources(server);

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

describe("MCP Resources", () => {
  it("lists all 3 resources", async () => {
    const result = await client.listResources();
    const uris = result.resources.map((r) => r.uri).sort();

    expect(uris).toHaveLength(3);
    expect(uris).toContain("newsapi://guide");
    expect(uris).toContain("newsapi://examples");
    expect(uris).toContain("newsapi://fields");
  });

  it("reads newsapi://guide resource", async () => {
    const result = await client.readResource({ uri: "newsapi://guide" });

    expect(result.contents).toHaveLength(1);
    const content = result.contents[0];
    expect(content.uri).toBe("newsapi://guide");
    expect(content.mimeType).toBe("text/plain");
    expect(typeof content.text).toBe("string");

    // Check for expected content
    const text = content.text as string;
    expect(text).toContain("NewsAPI MCP Server Guide");
    expect(text).toContain("suggest → search");
    expect(text).toContain("conceptUri");
    expect(text).toContain("detailLevel");
  });

  it("reads newsapi://examples resource", async () => {
    const result = await client.readResource({ uri: "newsapi://examples" });

    expect(result.contents).toHaveLength(1);
    const content = result.contents[0];
    expect(content.uri).toBe("newsapi://examples");

    const text = content.text as string;
    expect(text).toContain("NewsAPI MCP Examples");
    expect(text).toContain("Topic Search");
    expect(text).toContain("Person Tracking");
    expect(text).toContain("Event Monitoring");
    expect(text).toContain("Source Comparison");
    expect(text).toContain("Sentiment Filtering");
    expect(text).toContain("Date Range Search");
    expect(text).toContain("Multi-Concept Query");
  });

  it("reads newsapi://fields resource", async () => {
    const result = await client.readResource({ uri: "newsapi://fields" });

    expect(result.contents).toHaveLength(1);
    const content = result.contents[0];
    expect(content.uri).toBe("newsapi://fields");

    const text = content.text as string;
    expect(text).toContain("includeFields Groups");
    expect(text).toContain("detailLevel Presets");
    expect(text).toContain("Language Codes");
    expect(text).toContain("sentiment");
    expect(text).toContain("concepts");
    expect(text).toContain("minimal");
    expect(text).toContain("standard");
    expect(text).toContain("full");
  });

  it("resource descriptions are set correctly", async () => {
    const result = await client.listResources();
    const byUri = new Map(result.resources.map((r) => [r.uri, r]));

    const guide = byUri.get("newsapi://guide");
    expect(guide?.description?.toLowerCase()).toContain("guide");

    const examples = byUri.get("newsapi://examples");
    expect(examples?.description?.toLowerCase()).toContain("example");

    const fields = byUri.get("newsapi://fields");
    expect(fields?.description?.toLowerCase()).toContain("reference");
  });
});

describe("Server Instructions", () => {
  it("instructions string is non-empty", () => {
    expect(serverInstructions).toBeTruthy();
    expect(serverInstructions.length).toBeGreaterThan(100);
  });

  it("instructions contain critical workflow", () => {
    expect(serverInstructions).toContain("suggest");
    expect(serverInstructions).toContain("search");
    expect(serverInstructions).toContain("conceptUri");
  });

  it("instructions contain token optimization tips", () => {
    expect(serverInstructions).toContain("forceMaxDataTimeWindow");
    expect(serverInstructions).toContain("detailLevel");
    expect(serverInstructions).toContain("includeFields");
  });

  it("instructions contain workflow patterns", () => {
    expect(serverInstructions).toContain("Topic search");
    expect(serverInstructions).toContain("Event monitoring");
    expect(serverInstructions).toContain("Source-specific");
  });

  it("instructions mention resources", () => {
    expect(serverInstructions).toContain("newsapi://guide");
  });
});
