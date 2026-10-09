# Changelog

## [Unreleased]

### Breaking changes

- **One `search` tool** — `search_articles`, `search_events` and `search_mentions` are replaced by `search` with `kind: "articles" | "events" | "mentions"`. Paging and sorting are generic: `page`, `count`, `sortBy`, `options.sortByAsc` replace `articlesPage/Count/SortBy`, `eventsPage/Count/SortBy` and `mentionsPage/Count/SortBy`. Kind-only params are tagged in their descriptions and rejected with a corrective 400 for the other kinds
- **Rare filters under `options`** — Sentiment, source rank, author/location/source-group filters, secondary `ignore*` filters, date-mention filters, `dataType` and the `*SortByAsc` flags are accepted only inside the `options` object
- **31-day default window** — A search with no date filter covers the last 31 days (`forceMaxDataTimeWindow`, or `dateStart` for mentions); an unbounded search costs 65× as many API tokens. A note under the result says how to widen it
- **Default count 50** — Articles and mentions return 50 results by default (scans still ask for 100; events max 50)

### Features

- **Hosted server** — New Streamable HTTP entry point (`src/http.ts`) for `https://mcp.newsapi.ai/mcp`: users log in with their Event Registry account through the MCP client's OAuth flow instead of pasting an API key. Stateless, verifies JWT access tokens against the issuer's JWKS (`iss`, `aud`, `exp`), serves protected-resource metadata, and runs each request on the caller's own token. Configured via `MCP_PUBLIC_URL`, `MCP_AUTH_ISSUER`, `PORT`; `docs/deployment.md` covers deployment
- **Local server login** — `npx newsapi-mcp` without `NEWSAPI_KEY` logs in to Event Registry in the browser (authorization code + PKCE on a loopback redirect, ports 51337–51339), keeps the tokens in the OS credential store and refreshes them; `newsapi-mcp login` / `logout` manage the stored login. `NEWSAPI_KEY` still selects API-key mode
- **Login error guidance** — Tools explain an unlinked Event Registry account (sign in once at eventregistry.org/login) and an expired login (reconnect, or `npx newsapi-mcp login` locally) instead of the API key message
- **Docker image** — `Dockerfile` and `npm run build:http` build the hosted server; `GET /healthz` for health checks
- **Hosted results as source material** — The hosted server marks tool results with `audience: ["assistant"]`, wraps them in `<source_material>` tags and tells the model to report key points with links instead of pasting raw results
- **Mentions** — `search({kind: "mentions"})` returns sentences tagged with an event type (acquisition, layoffs, launch, recall, …) with the entities involved, sentiment, fact level and a link to the article. Mention-only filters: `eventTypeUri`, `industryUri`, `sdgUri`, `sasbUri`, `esgUri`, `factLevel`, sentence index range, `showDuplicates`; `includeFields` groups `slots`, `categories`, `frameworks`, `metadata`, `full`; aggregate `eventTypeAggr`. `suggest(type: "eventTypes")` resolves event type names to URIs
- **Aggregate result types** — Article and event searches accept `resultType` set to one aggregate (`timeAggr`, `sourceAggr`, `authorAggr`, `keywordAggr`, `locAggr`, `conceptAggr`, `categoryAggr`, `sentimentAggr`, `langAggr`) that summarises every match in one call, rendered as label/count rows
- **`get_breaking_events`** — Wraps `event/getBreakingEvents` with count, page and minimum score; events keep their breaking score
- **Server-side query composition** — Flat filters given alongside an advanced `query` are merged into it (leaf filters ANDed, `ignore*` as `$not`, duplicate/sentiment/rank flags into `$filter`) instead of being rejected by the API; arrays and `$not` lists are normalised. `query` is documented as a grammar with worked examples, and query-shaped 400s return rewrite guidance
- **Boolean keyword strings** — `keyword: "Tesla AND (recall OR lawsuit) NOT Musk"` is detected and sent with `keywordSearchMode: "exact"`; `keywordSearchMode` is also exposed directly
- **Cost notes** — A search that costs more than 1 API token says why under the result (events cost 5; dates reaching back more than 31 days cost 5–10×), and the server instructions map "recent / this week / last month" to `forceMaxDataTimeWindow`

### Improvements

- **Compact scan rows** — With `articleBodyLen: 0` each article is one row (`# | uri | date | source | title`); `get_article_details` supplies the text and URL. Notes under the result report applied defaults and body truncation
- **Publish time in rows** — Article, scan, detail and mention rows show `YYYY-MM-DD HH:MM` instead of the day alone, and date-sorted article pages are re-sorted by publish time (the API orders by crawl time). Events keep their day-only date
- **Smaller schema and instructions** — Shared parameter and tool descriptions were shortened and the guidance moved into the server instructions; the shared filters and query grammar load once for the single `search` tool, cutting the session-start cost from about 15.8k to about 10.5k tokens
- **Response cap 50k chars** — Oversized results are truncated at a clean boundary (was 100k) so clients with a 25k-token tool-result limit do not drop them
- **Pagination footer** — List formatters share one footer with page, count and total

### Changes

- **Suggest cache removed** — `suggest` calls the API every time; the cheap endpoints gained nothing from caching, and the "(cached)" token footer is gone
- **Dependencies** — Lock file bumped to clear `npm audit` findings; no `package.json` range changes

## [1.3.1] - 2026-03-18

### Features

- **News research skill** — Added Claude Code skill (`skill/SKILL.md`) with 10 report templates (adverse media, company intel, economic, geopolitical, investing, political, research, sentiment, supply chain, findings) for structured news analysis workflows

### Improvements

- **Streamlined server instructions** — Simplified scan→triage→retrieve workflow descriptions, removed verbose code examples and redundant guidance from both instructions and guide resource
- **Better event search descriptions** — `search_events` description now explains deduplication benefit and sorting/filtering tips; `get_event_details` resultType enum reformatted for readability

## [1.3.0] - 2026-03-11

### Features

- **Missing sort and result type options** — Added `sourceImportanceRank` and `sourceAlexaCountryRank` to `articlesSortBy`, and `keywordAggr`, `sourceExAggr`, `dateMentionAggr`, `articleTrend` to `get_event_details` resultType
- **Scan→triage→retrieve workflow** — Server instructions and guide resource restructured around token-efficient article retrieval pattern with title-only scanning, relevance triage, and selective detail fetching

### Fixes

- **Empty URI in formatter output** — Articles/events missing a URI no longer produce blank lines in formatted results

### Docs

- **Usage tracking requirements** — Instructions now require reporting request count and tokens consumed (not remaining quota)
- **`articleBodyLen` default clarified** — Description updated to reflect the actual default of 1000 characters

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
