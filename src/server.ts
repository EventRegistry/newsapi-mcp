import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { REPORTING_RULES, serverInstructions } from "./instructions.js";
import { registerResources } from "./resources.js";
import { allTools, ToolRegistry } from "./tools/index.js";
import { VERSION } from "./version.js";

export interface ServerOptions {
  /** Mark tool results as source material for the model (ADR-0003). */
  hosted?: boolean;
}

/** Build an McpServer with all tools, resources and instructions attached. */
export function createServer({
  hosted = false,
}: ServerOptions = {}): McpServer {
  const server = new McpServer(
    { name: "newsapi", version: VERSION },
    {
      instructions: hosted
        ? `${serverInstructions}\n\n${REPORTING_RULES}`
        : serverInstructions,
    },
  );
  new ToolRegistry(allTools, hosted).attach(server);
  registerResources(server, hosted);
  return server;
}
