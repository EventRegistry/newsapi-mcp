#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { initClient } from "./client.js";
import { serverInstructions } from "./instructions.js";
import { registerResources } from "./resources.js";
import { allTools, ToolRegistry } from "./tools/index.js";

const apiKey = process.env.NEWSAPI_KEY;
if (!apiKey) {
  console.error("NEWSAPI_KEY environment variable is required");
  process.exit(1);
}
initClient(apiKey);

const server = new McpServer(
  { name: "newsapi", version: "1.0.0" },
  { instructions: serverInstructions },
);

const registry = new ToolRegistry(allTools);
registry.attach(server);
registerResources(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
