# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build          # TypeScript compilation (tsc)
npm run build:bundle   # Production single-file bundle (esbuild → dist/index.js)
npm run dev            # Dev mode with tsx hot reload
npm test               # Run all tests (vitest)
npm run test:watch     # Tests in watch mode
npx vitest run tests/formatters.test.ts  # Run single test file
```

CI runs on [ubuntu, windows, macos] × [node 20, 22]. Publishing uses `npm publish --provenance` triggered by GitHub releases.

## Architecture

MCP server for NewsAPI.ai (Event Registry). Provides 13 tools for searching news articles, events, and sources.

### Request Flow

```
MCP Client → McpServer (SDK) → ToolRegistry handler → apiPost()/analyticsPost() → NewsAPI.ai
                                      ↓
                              Response Filter (strip fields)
                                      ↓
                              Formatter (JSON → text, optional)
                                      ↓
                              MCP Response back to client
```

### Key Modules

- **`src/client.ts`** — HTTP client. `apiPost()` for main API, `analyticsPost()` for analytics. Auto-injects API key.
- **`src/tools/registry.ts`** — `ToolRegistry` class. Registers all tools at startup. `buildZodShape()` converts JSON Schema → Zod for MCP SDK registration.
- **`src/response-filter.ts`** — Token optimization. `includeFields` param maps to API include params + post-response field stripping. `filterResponse()` preserves pagination metadata.
- **`src/formatters.ts`** — Converts JSON responses to compact text. Suggest tools always format (JSONL output). Search tools use optional `format` param.
- **`src/tools/*.ts`** — Tool definitions as `ToolDef` objects with `name`, `description`, `schema` (JSON Schema), `handler`, and optional `formatter`.

### Detail Level Presets

The `detail_level` param on search tools controls defaults:
- **minimal**: 5 results, 200-char bodies
- **standard** (default): 10 results, full bodies
- **full**: API maximums, full bodies

Explicit params (e.g. `articlesCount`) override presets.

### Testing Patterns

Tests mock `fetch` globally via `vi.stubGlobal("fetch", fetchSpy)`. Server integration tests use `InMemoryTransport.createLinkedPair()` to create connected MCP client/server pairs without network.

## Codebase Conventions

- `ToolDef` is the canonical tool definition type — tools export arrays of `ToolDef` objects
- Suggest tool formatters always apply (no `format` param in schema) — output is JSONL, not JSON arrays
- `contentFilterProps` in articles.ts is shared across article and event search tools
- The linter auto-formats on save (may adjust ternary formatting etc.)
- Single-file distribution via esbuild — `prepublishOnly` runs `build:bundle`
