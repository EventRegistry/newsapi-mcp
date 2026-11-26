import { McpServer } from "@modelcontextprotocol/server";
import {
  memorySkillFiles,
  SkillCatalog,
  SkillsExtension,
  type SkillSource,
} from "@modelcontextprotocol/server/ext/skills";
import { REPORTING_RULES, serverInstructions } from "./instructions.js";
import { CACHE_HINT, registerResources } from "./resources.js";
import { SKILL_FILES } from "./skills/content.js";
import { allTools, ToolRegistry } from "./tools/index.js";
import { VERSION } from "./version.js";

const SKILL_URI_ROOT = "skill://";

/**
 * Serve the catalog's skills without its resources/list entries and directory
 * reads, so clients older than 2026-07-28 see no skills.
 */
function skillsOnly(catalog: SkillCatalog): SkillSource {
  const byUri = new Map(catalog.entries.map((skill) => [skill.uri, skill]));
  return {
    list: async () => ({ skills: [...catalog.entries] }),
    get: async (uri) => byUri.get(uri),
    read: async (uri) => {
      const path = uri.startsWith(SKILL_URI_ROOT)
        ? uri.slice(SKILL_URI_ROOT.length)
        : undefined;
      // own keys only: an inherited name like "constructor" is not a file
      const text =
        path !== undefined && Object.hasOwn(SKILL_FILES, path)
          ? SKILL_FILES[path]
          : undefined;
      return text === undefined
        ? undefined
        : { text, mimeType: "text/markdown" };
    },
  };
}

// strict: a malformed skill fails at startup, not in a client
const skills = new SkillsExtension({
  source: skillsOnly(
    await SkillCatalog.load(memorySkillFiles(SKILL_FILES), { strict: true }),
  ),
  cacheHint: CACHE_HINT,
  strict: true,
});

export interface ServerOptions {
  /** Mark tool results as source material for the model. */
  hosted?: boolean;
}

/** Build an McpServer with its tools, resources, skills and instructions. */
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
  skills.attach(server);
  return server;
}
