#!/usr/bin/env node
import { serveStdio } from "@modelcontextprotocol/server/stdio";
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

  // serves both an old initialize and the 2026-07-28 server/discover
  serveStdio(() => createServer(), {
    onerror: (err) => console.error("MCP stdio error:", err),
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
