# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build          # TypeScript compilation (tsc)
npm run build:bundle   # Production single-file bundle (esbuild → dist/index.js)
npm run build:http     # Hosted server bundle (esbuild → dist/http.js, used by Dockerfile)
npm run build:skills     # Claude Desktop skill zips (dist/skills/)
npm run build:skill-content  # Regenerate src/skills/content.ts after editing src/skills/
npm run dev            # Dev mode with tsx hot reload
npm test               # Run all tests (vitest)
npm run test:watch     # Tests in watch mode
npx vitest run tests/formatters.test.ts  # Run single test file
```

CI runs on [ubuntu, windows, macos] × [node 20, 22]. Publishing uses `npm publish --provenance` triggered by GitHub releases.

## Architecture

MCP server for NewsAPI.ai (Event Registry). Provides 8 tools: one `search` tool (`kind`: articles, events, mentions), detail lookups, topic pages, suggest and usage, and serves eight research skills to 2026-07-28 clients.

Two entry points share `createServer()` from `src/server.ts`:

- **Local server** — `src/index.ts`, stdio through the SDK's `serveStdio()` helper. Logs in to Event Registry through a loopback browser flow (`src/oauth.ts`) unless `NEWSAPI_KEY` selects API-key mode; `login`/`logout` subcommands manage the stored tokens. Published to npm.
- **Hosted server** — `src/http.ts`, stateless Streamable HTTP through the SDK 2 handler (`createMcpHandler()` with `toNodeHandler()`; fresh `McpServer` per request), login run by the MCP client. Verifies JWT access tokens, then runs the request inside `withAccessToken()` so `client.ts` sends `Authorization: Bearer` instead of the API key. Shipped as a Docker image, not in the npm package.

Both servers run on MCP SDK 2 and serve the older protocol revisions (back to 2024-10-07) as well as 2026-07-28. On 2026-07-28 the tool list and resources carry a one-hour public cache hint (`CACHE_HINT` in `src/resources.ts`), and every tool is marked read-only and idempotent.

### Request Flow

```
MCP Client → McpServer (SDK) → ToolRegistry handler → apiPost() → NewsAPI.ai
                                      ↓
                              Response Filter (strip fields)
                                      ↓
                              Formatter (JSON → text, optional)
                                      ↓
                              MCP Response back to client
```

### Key Modules

- **`src/client.ts`** — HTTP client. `apiPost()` for main API. Injects the API key, the local login's bearer token (renewed once and retried on 401), or the hosted caller's bearer token when inside `withAccessToken()` (AsyncLocalStorage). `authMode()` tells the error formatter which guidance to give.
- **`src/oauth.ts`** — Local login: `OAuthSession` (PKCE code flow on fixed loopback ports, single-flight refresh with rotation), token stores (`@napi-rs/keyring`, file fallback), OpenID discovery shared with `http.ts`.
- **`src/http.ts`** — Hosted server: express app, protected-resource metadata, `requireBearerAuth` with a `jose` JWT verifier, `/healthz`. Config from `MCP_PUBLIC_URL`, `MCP_AUTH_ISSUER`, `PORT`.
- **`src/query.ts`** — Search request builder shared by the search tools: expands comma lists, folds flat filters into an advanced `query` (`$and` leaf, `ignore*` → `$not`, `$filter`), normalises arrays to `{"$or"}`, auto-detects boolean keyword strings (`keywordSearchMode: exact`) and applies the 31-day default window; returns `notes` the registry prints under the result.
- **`src/tools/registry.ts`** — `ToolRegistry` class. Registers all tools at startup. `buildZodShape()` converts JSON Schema → Zod for MCP SDK registration (wrapped in `z.object()` for `registerTool`).
- **`src/response-filter.ts`** — Token optimization. `includeFields` param maps to API include params + post-response field stripping. `filterResponse()` preserves pagination metadata.
- **`src/formatters.ts`** — Converts JSON responses to compact text. All tools with formatters output human-readable numbered text.
- **`src/tools/search.ts`** — The `search` tool: assembles the schema from the shared filters plus each kind's `SearchKind` config (`articlesKind`, `eventsKind`, `mentionsKind` in their own files), tags kind-only params in their descriptions, maps the generic `page`/`count`/`sortBy` to the API's per-kind names and rejects params the chosen kind does not accept.
- **`src/skills/`** — The eight research skills: `<name>/SKILL.md` sources, shared rules in `_shared/reporting.md` and `_shared/references/*.md`. `scripts/skill-transform.js` makes each skill self-contained (shared files copied in, plugin paths made relative, `allowed-tools` dropped); `scripts/generate-skill-content.js` (`npm run build:skill-content`) embeds the result in the generated `content.ts`, so both bundles carry the skills. `tests/skills-content.test.ts` fails when `content.ts` is out of date. `src/server.ts` loads the content into a strict `SkillCatalog` once and serves it to 2026-07-28 clients through a `SkillsExtension` with the one-hour `CACHE_HINT`. `scripts/build-desktop-skills.js` zips the same skills for Claude Desktop.
- **`src/tools/*.ts`** — Tool definitions as `ToolDef` objects with `name`, `description`, `schema` (JSON Schema), `handler`, and optional `formatter`.

### Default Values

The search tool defaults to `count=50` (scans ask for 100; events max 50), `articleBodyLen=1000`, and a 31-day window (`forceMaxDataTimeWindow=31`, or `dateStart` for mentions) when no date filter is given. Set `articleBodyLen: -1` for full text, `0` to exclude body (scan mode: one compact row per article).

### Testing Patterns

Tests mock `fetch` globally via `vi.stubGlobal("fetch", fetchSpy)`. Server integration tests use `InMemoryTransport.createLinkedPair()` (from the SDK 2 packages) to create connected MCP client/server pairs without network; an in-memory pair speaks revisions up to 2025-11-25, so 2026-07-28 tests go through the stdio or HTTP helper. Old-protocol tests use the SDK 1 client from the dev-only `mcp-sdk-v1` alias. `tests/stdio.test.ts` runs against the bundle, so run `npm run build:bundle` first; without it the file skips with a warning outside CI. Hosted server tests (`tests/http.test.ts`) listen on a local port, keep the real `fetch` for it, and sign tokens with a locally generated key checked through a local JWKS. Login tests (`tests/oauth.test.ts`) inject a fake issuer `fetch`, an in-memory store and a "browser" that hits the real loopback callback. `tests/skills-zip.test.ts` runs the real zip build into `dist/skills` during `npm test` and skips with a warning when `zip` or `unzip` is missing; `tests/skills-content.test.ts` fails until `npm run build:skill-content` is rerun after editing `src/skills/`.

## Codebase Conventions

- `ToolDef` is the canonical tool definition type — tools export arrays of `ToolDef` objects
- All tools with formatters output human-readable text (numbered lists with URIs)
- `contentFilterProps` in articles.ts holds every shared filter; `coreFilterProps` are exposed at the top level of `search` and the rare ones (`RARE_FILTER_KEYS`) go under its `options` object, flattened by `flattenOptions`
- The linter auto-formats on save (may adjust ternary formatting etc.)
- Single-file distribution via esbuild — `prepublishOnly` runs `build:bundle`
