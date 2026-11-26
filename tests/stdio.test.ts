import { describe, it, expect, afterEach } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { Client as ClientV1 } from "mcp-sdk-v1/client/index.js";
import { StdioClientTransport as StdioTransportV1 } from "mcp-sdk-v1/client/stdio.js";

// Runs against the bundle `npm run build:bundle` writes; CI builds it before
// the tests. Locally the suite skips when the bundle is missing.
const BUNDLE = fileURLToPath(new URL("../dist/index.js", import.meta.url));
const NEW_PROTOCOL = "2026-07-28";
const TOOL_COUNT = 8;

const isBuilt = existsSync(BUNDLE);
const shouldRun = isBuilt || Boolean(process.env.CI);

if (!shouldRun) {
  console.warn(
    "stdio tests skipped: dist/index.js is missing, run `npm run build:bundle`",
  );
}

/** Spawn the built local server in API-key mode, without a shell. */
function serverParams() {
  return {
    command: process.execPath,
    args: [BUNDLE],
    env: Object.fromEntries(
      Object.entries({ ...process.env, NEWSAPI_KEY: "dummy" }).filter(
        (entry): entry is [string, string] => entry[1] !== undefined,
      ),
    ),
  };
}

describe.skipIf(!shouldRun)("local server over stdio", () => {
  const closers: (() => Promise<void>)[] = [];

  afterEach(async () => {
    await Promise.all(closers.splice(0).map((close) => close()));
  });

  it("serves an SDK 1 client", async () => {
    const client = new ClientV1({ name: "old-client", version: "1.0.0" });
    closers.push(() => client.close());
    await client.connect(new StdioTransportV1(serverParams()));

    const { tools } = await client.listTools();

    expect(tools).toHaveLength(TOOL_COUNT);
  });

  it("serves a 2026-07-28 client", async () => {
    const client = new Client(
      { name: "new-client", version: "1.0.0" },
      { versionNegotiation: { mode: { pin: NEW_PROTOCOL } } },
    );
    closers.push(() => client.close());
    await client.connect(new StdioClientTransport(serverParams()));

    const { tools } = await client.listTools();

    expect(client.getNegotiatedProtocolVersion()).toBe(NEW_PROTOCOL);
    expect(tools).toHaveLength(TOOL_COUNT);
  });
});
