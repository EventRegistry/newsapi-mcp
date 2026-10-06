#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { initClient, initLogin } from "./client.js";
import { createSession } from "./oauth.js";
import { createServer } from "./server.js";

const USAGE = `Usage: newsapi-mcp [login|logout]

  (no command)  Run the MCP server over stdio. Uses NEWSAPI_KEY when set,
                otherwise your Event Registry login (browser opens on first use).
  login         Log in to Event Registry in the browser and store the tokens.
  logout        Forget the stored login.`;

async function main() {
  const [command] = process.argv.slice(2);
  if (command === "login") {
    await createSession().login();
    console.error("Logged in to Event Registry.");
    return;
  }
  if (command === "logout") {
    await createSession().logout();
    console.error("Logged out of Event Registry.");
    return;
  }
  if (command !== undefined) {
    console.error(USAGE);
    process.exit(command === "--help" || command === "-h" ? 0 : 1);
  }

  const apiKey = process.env.NEWSAPI_KEY;
  if (apiKey) initClient(apiKey);
  else initLogin(createSession());

  const server = createServer();
  await server.connect(new StdioServerTransport());
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
