import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { serverInstructions } from "./instructions.js";
import { registerResources } from "./resources.js";
import { allTools, ToolRegistry } from "./tools/index.js";
import { VERSION } from "./version.js";

/** Build an McpServer with all tools, resources and instructions attached. */
export function createServer(): McpServer {
  const server = new McpServer(
    { name: "newsapi", version: VERSION },
    { instructions: serverInstructions },
  );
  new ToolRegistry(allTools).attach(server);
  registerResources(server);
  return server;
}
