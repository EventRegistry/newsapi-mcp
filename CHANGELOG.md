# Changelog

## [1.2.0] - 2026-03-04

### Features

- **Per-request token usage footer** — Every tool response now includes a footer showing tokens consumed and remaining quota (e.g., `Tokens used: 5 | Remaining: 49995`), replacing the old start/end `get_api_usage` workflow
- **`extended` detail level (new default)** — New preset returning 50 articles/20 events with 1000-char body previews, balancing coverage and context window usage. Previous default `standard` (10 results) is still available
- **Exclusion filters** — All search tools now support `ignoreKeyword`, `ignoreConceptUri`, `ignoreCategoryUri`, `ignoreSourceUri`, `ignoreLocationUri`, `ignoreAuthorUri`, `ignoreLang`, and more for filtering out unwanted results
- **Boolean operators** — `conceptOper` and `categoryOper` params (`"and"` / `"or"`) for controlling how multiple concept or category URIs combine
- **Date mention filters** — `dateMentionStart` / `dateMentionEnd` filter articles by dates mentioned in their content
- **Response truncation** — Oversized responses (>100K chars) are automatically truncated at a clean boundary with a warning, preventing context window overflow
- **Concurrent request error handling** — HTTP 503 (concurrent request limit) is now a distinct error category with specific recovery guidance

### Fixes

- **Event search sentiment params** — `minSentiment`/`maxSentiment` are now correctly renamed to `minSentimentEvent`/`maxSentimentEvent` for the events API
- **Event search param cleanup** — Article-only params (`startSourceRankPercentile`, `endSourceRankPercentile`) are stripped before sending to the events API
- **Suggest cache token reporting** — Cached suggest results correctly show `Tokens used: 0 (cached)` instead of omitting the footer

## [1.1.3] - 2026-02-26

### Fixes

- **Exact token count reporting** — Removed `toLocaleString()` from usage formatter so token counts are plain numbers, enabling LLMs to compute precise differences

## [1.1.2] - 2026-02-26

- **README rewrite** — Collapsible configuration sections, expanded tools table with per-tool descriptions, and usage pattern examples

## [1.1.1] - 2026-02-26

### Fixes

- **URI-aware comma splitting** — `parseArray()` no longer splits Wikipedia URIs containing commas (e.g., `Tesla,_Inc.`) into garbage fragments; splits only on commas followed by a URL scheme

### Docs

- **Keyword matching clarification** — Documented that each keyword value matches as an exact phrase and that terms should be comma-separated for word-level matching

## [1.1.0] - 2026-02-10

### Features

- **Unified suggest tool** — Consolidated 5 separate suggest tools into a single `suggest` tool with a `type` parameter (concepts, categories, sources, locations, authors), reducing tool count from 13 to 8
- **Enrichment data rendering** — `includeFields` data (sentiment, concepts, categories, etc.) now renders in formatted output instead of being silently dropped
- **Structured error handling** — Categorized API errors (auth, rate limit, invalid params, etc.) with LLM-friendly recovery guidance and parameter suggestions
- **LRU cache for suggest** — In-memory cache (1000 entries, 24h TTL) reduces API calls for repeated entity lookups
- **Server instructions and resources** — Built-in LLM guidance via MCP instructions and 3 documentation resources (`newsapi://guide`, `newsapi://examples`, `newsapi://fields`)
- **56 language codes** — Expanded language support from 10 to 56 codes with better error hints
- **`forceMaxDataTimeWindow` parameter** — Limit search results to last 7 or 31 days for efficient recent news queries

### Fixes

- **Event article counts** — Fixed events always showing "0 articles" by requesting article count data from the API and reading the correct response field
- **Article URIs in output** — Article URIs now appear in formatted search results, making `get_article_details` reachable
- **Multi-language label rendering** — Fixed `[object Object]` display when API returns label objects (`{eng: "Tesla"}`) instead of strings
- **Removed broken `find_event_for_text` tool** — Removed tool that consistently returned no results due to unsupported API usage

### Improvements

- **Text-only output** — All tools now return compact human-readable text instead of raw JSON, with consistent numbered-list formatting
- **`detailLevel` presets** — `minimal` (5 results, 200-char bodies), `standard` (10, full), and `full` (API max) presets for controlling result volume
- **Better tool descriptions** — All tools include workflow examples, usage guidance, and "use this / not this" hints for LLM agents
- **Concept selection guidance** — Tool descriptions guide LLMs to prefer established Wikipedia concepts over year-specific ones and to search in English first

## [1.0.0] - 2026-02-03

Initial public release of the NewsAPI MCP server.

### Features

- **MCP server for NewsAPI.ai** — Article search, event search, trending topics, suggest tools, and topic page tools
- **npx support** — Run directly via `npx newsapi-mcp` with bin field and shebang
- **Response filtering** — `includeFields` parameter to select field groups (sentiment, concepts, categories, etc.) and strip unrequested data
- **Standalone bundle** — esbuild-based `build:bundle` script producing self-contained `dist/index.js`
- **Result count defaults** — JSON Schema `default` and `maximum` on all count parameters to throttle LLM requests
