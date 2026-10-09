# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build          # TypeScript compilation (tsc)
npm run build:bundle   # Production single-file bundle (esbuild → dist/index.js)
npm run build:http     # Hosted server bundle (esbuild → dist/http.js, used by Dockerfile)
npm run dev            # Dev mode with tsx hot reload
npm test               # Run all tests (vitest)
npm run test:watch     # Tests in watch mode
npx vitest run tests/formatters.test.ts  # Run single test file
```

CI runs on [ubuntu, windows, macos] × [node 20, 22]. Publishing uses `npm publish --provenance` triggered by GitHub releases.

## Architecture

MCP server for NewsAPI.ai (Event Registry). Provides 10 tools for searching news articles, events, mentions, and sources.

Two entry points share `createServer()` from `src/server.ts`:

- **Local server** — `src/index.ts`, stdio. Logs in to Event Registry through a loopback browser flow (`src/oauth.ts`, ADR-0001) unless `NEWSAPI_KEY` selects API-key mode; `login`/`logout` subcommands manage the stored tokens. Published to npm.
- **Hosted server** — `src/http.ts`, stateless Streamable HTTP (fresh `McpServer` per request, ADR-0002), login run by the MCP client (ADR-0001). Verifies JWT access tokens, then runs the request inside `withAccessToken()` so `client.ts` sends `Authorization: Bearer` instead of the API key. Shipped as a Docker image, not in the npm package.

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
- **`src/tools/registry.ts`** — `ToolRegistry` class. Registers all tools at startup. `buildZodShape()` converts JSON Schema → Zod for MCP SDK registration.
- **`src/response-filter.ts`** — Token optimization. `includeFields` param maps to API include params + post-response field stripping. `filterResponse()` preserves pagination metadata.
- **`src/formatters.ts`** — Converts JSON responses to compact text. All tools with formatters output human-readable numbered text.
- **`src/tools/*.ts`** — Tool definitions as `ToolDef` objects with `name`, `description`, `schema` (JSON Schema), `handler`, and optional `formatter`.

### Default Values

Search tools use these defaults when params are not explicitly set: `articlesCount=100`, `eventsCount=50`, `articleBodyLen=1000`, and a 31-day window (`forceMaxDataTimeWindow=31`, or `dateStart` for mentions) when no date filter is given. Set `articleBodyLen: -1` for full text, `0` to exclude body (scan mode: one compact row per article).

### Testing Patterns

Tests mock `fetch` globally via `vi.stubGlobal("fetch", fetchSpy)`. Server integration tests use `InMemoryTransport.createLinkedPair()` to create connected MCP client/server pairs without network. Hosted server tests (`tests/http.test.ts`) listen on a local port, keep the real `fetch` for it, and sign tokens with a locally generated key checked through a local JWKS. Login tests (`tests/oauth.test.ts`) inject a fake issuer `fetch`, an in-memory store and a "browser" that hits the real loopback callback.

## Codebase Conventions

- `ToolDef` is the canonical tool definition type — tools export arrays of `ToolDef` objects
- All tools with formatters output human-readable text (numbered lists with URIs)
- `contentFilterProps` in articles.ts is shared across the search tools; `coreFilterProps` are exposed at top level and the rare ones go under an `options` object (`optionsProp`), flattened by `flattenOptions` in each handler
- The linter auto-formats on save (may adjust ternary formatting etc.)
- Single-file distribution via esbuild — `prepublishOnly` runs `build:bundle`

## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
