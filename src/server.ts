import { McpServer } from "@modelcontextprotocol/server";
import { REPORTING_RULES, serverInstructions } from "./instructions.js";
import { CACHE_HINT, registerResources } from "./resources.js";
import { allTools, ToolRegistry } from "./tools/index.js";
import { VERSION } from "./version.js";

export interface ServerOptions {
  /** Mark tool results as source material for the model. */
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
      // the lists never change, so clients need no notification stream
      capabilities: {
        tools: { listChanged: false },
        resources: { listChanged: false },
      },
      cacheHints: {
        "tools/list": CACHE_HINT,
        "resources/list": CACHE_HINT,
        "resources/read": CACHE_HINT,
      },
    },
  );
  new ToolRegistry(allTools, hosted).attach(server);
  registerResources(server, hosted);
  return server;
}
