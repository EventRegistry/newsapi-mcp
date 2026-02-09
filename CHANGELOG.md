# Changelog

## [1.0.0] - 2026-02-03

Initial public release of the NewsAPI MCP server.

### Features

- **MCP server for NewsAPI.ai** — Article search, event search, trending topics, suggest tools, and topic page tools
- **npx support** — Run directly via `npx newsapi-mcp` with bin field and shebang
- **Response filtering** — `includeFields` parameter to select field groups (sentiment, concepts, categories, etc.) and strip unrequested data
- **Standalone bundle** — esbuild-based `build:bundle` script producing self-contained `dist/index.js`
- **Result count defaults** — JSON Schema `default` and `maximum` on all count parameters to throttle LLM requests
