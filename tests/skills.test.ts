import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { createHash } from "node:crypto";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import {
  SKILLS_EXTENSION_ID,
  SkillsClient,
  type Skill,
} from "@modelcontextprotocol/client/ext/skills";
import { Client as ClientV1 } from "mcp-sdk-v1/client/index.js";
import { InMemoryTransport as InMemoryTransportV1 } from "mcp-sdk-v1/inMemory.js";
import {
  FRONTMATTER,
  readSkillSources,
  selfContainedSkills,
} from "../scripts/skill-transform.js";
import { initClient } from "../src/client.js";
import { createServer } from "../src/server.js";

const NEW_PROTOCOL = "2026-07-28";
const ONE_HOUR_MS = 3_600_000;

/** The skill names the transform builds from src/skills. */
function sourceSkillNames(): string[] {
  return Object.keys(selfContainedSkills(readSkillSources())).sort();
}

/**
 * Connect a client pinned to protocol 2026-07-28. Only the handler speaks that
 * revision; an in-memory pair stops at 2025-11-25.
 */
async function connectNewProtocolClient(): Promise<Client> {
  const handler = createMcpHandler(() => createServer(), {
    legacy: "stateless",
  });
  const client = new Client(
    { name: "test-client", version: "1.0.0" },
    { versionNegotiation: { mode: { pin: NEW_PROTOCOL } } },
  );
  await client.connect(
    new StreamableHTTPClientTransport(new URL("http://server.test/mcp"), {
      fetch: (input, init) => handler.fetch(new Request(input, init)),
    }),
  );
  return client;
}

function sha256Digest(text: string): string {
  return `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;
}

describe("served skills on protocol 2026-07-28", () => {
  let client: Client;
  let skillsClient: SkillsClient;
  let skills: Skill[];

  beforeAll(async () => {
    initClient("test-key");
    client = await connectNewProtocolClient();
    skillsClient = new SkillsClient(client);
    ({ skills } = await skillsClient.list());
  });

  afterAll(async () => {
    await client.close();
  });

  it("declares the skills extension and lists a skill for each source folder", () => {
    const names = skills.map((skill) => skill.frontmatter.name).sort();

    expect(client.getServerCapabilities()?.extensions).toHaveProperty(
      SKILLS_EXTENSION_ID,
    );
    expect(skillsClient.supported).toBe(true);
    expect(names).toHaveLength(6);
    expect(names).toEqual(sourceSkillNames());
  });

  it("lists each skill at skill://<name>/SKILL.md", () => {
    for (const skill of skills) {
      expect(skill.uri).toBe(`skill://${skill.frontmatter.name}/SKILL.md`);
    }
  });

  it("matches every manifest entry's size and digest to the bytes read", async () => {
    for (const skill of skills) {
      expect(skill.resources).not.toBe("dynamic");
      for (const entry of skill.resources as Skill["resources"] & unknown[]) {
        const { contents } = await client.readResource({ uri: entry.uri });
        const text = (contents[0] as { text: string }).text;

        expect(Buffer.byteLength(text, "utf8"), entry.uri).toBe(entry.size);
        expect(sha256Digest(text), entry.uri).toBe(entry.digest);
      }
    }
  });

  it("serves a SKILL.md with no allowed-tools and no plugin path", async () => {
    for (const skill of skills) {
      const { text } = await skillsClient.read(skill);

      expect(text, skill.uri).not.toContain("allowed-tools");
      expect(text, skill.uri).not.toContain("CLAUDE_PLUGIN_ROOT");
    }
  });

  it("lists every relative path a SKILL.md names in its manifest", async () => {
    const relativePath = /(?<![\w/.-])(?:[\w-]+\/)*[\w-]+\.md\b/g;
    for (const skill of skills) {
      const { text } = await skillsClient.read(skill);
      const listed = (skill.resources as { uri: string }[]).map((entry) =>
        entry.uri.slice(`skill://${skill.frontmatter.name}/`.length),
      );
      const named = new Set(
        (text ?? "").replace(FRONTMATTER, "").match(relativePath),
      );

      expect(named.size, skill.uri).toBeGreaterThan(0);
      for (const path of named) {
        expect(listed, `${skill.uri} names ${path}`).toContain(path);
      }
    }
  });

  it("gives the skill list a one-hour public cache lifetime", async () => {
    const listing = await skillsClient.list();

    expect(listing.ttlMs).toBe(ONE_HOUR_MS);
    expect(listing.cacheScope).toBe("public");
  });

  it("answers resource-not-found for skill://constructor", async () => {
    await expect(
      client.readResource({ uri: "skill://constructor" }),
    ).rejects.toThrow(
      "Resource not found: skill://constructor",
    );
  });
});

describe("served skills with an SDK 1 client", () => {
  let clientV1: ClientV1;
  let server: McpServer;

  beforeAll(async () => {
    initClient("test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ remainingTokens: 100, usedTokens: 5 }),
        headers: { get: () => null },
      }),
    );
    server = createServer();
    clientV1 = new ClientV1({ name: "old-client", version: "1.0.0" });
    const [clientTransport, serverTransport] =
      InMemoryTransportV1.createLinkedPair();
    await Promise.all([
      clientV1.connect(clientTransport),
      server.connect(serverTransport),
    ]);
  });

  afterAll(async () => {
    await clientV1.close();
    await server.close();
    vi.unstubAllGlobals();
  });

  it("lists no skill:// resource", async () => {
    const { resources } = await clientV1.listResources();

    expect(resources.length).toBeGreaterThan(0);
    expect(resources.filter((r) => r.uri.startsWith("skill://"))).toEqual([]);
  });

  it("still calls a tool", async () => {
    const result = await clientV1.callTool({
      name: "get_api_usage",
      arguments: {},
    });

    expect(result.isError).toBeFalsy();
  });
});
