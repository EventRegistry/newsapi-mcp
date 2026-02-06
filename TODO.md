# NewsAPI.ai MCP Server — Best Practices TODO

Findings from analyzing the current implementation against MCP best practices (official docs, Anthropic guidelines, real-world servers like Brave Search, GitHub, Blockscout).

---

## Token Optimization (P0 — highest impact)

### Compact JSON responses
- **Current**: `JSON.stringify(result, null, 2)` — pretty-printed JSON with indentation
- **Best practice**: Plain text responses use ~80% fewer tokens than JSON. Compact JSON (no indentation) is a simple middle ground.
- **Next steps**:
  - [x] Remove indentation: `JSON.stringify(result)` instead of `JSON.stringify(result, null, 2)`
  - [x] Evaluate plain-text formatted responses for high-frequency tools (search_articles, suggest_*)
  - [x] Consider a `format` parameter (`json` | `text`) so the LLM can choose
  - [ ] Once all tools have formatters, remove `format` parameter entirely — always use compact formatted output

### Dynamic toolsets / tool filtering
- **Current**: ToolRegistry groups tools into categories. Only core tools registered by default (6 tools: search_articles, search_events, suggest_concepts, get_api_usage + 2 meta-tools). LLM enables additional categories via `enable_toolset`.
- **Completed**:
  - [x] Group tools into categories (search, suggest, topic_pages, usage)
  - [x] Add `list_available_tools` meta-tool showing categories + enabled/disabled status
  - [x] Register only core tools by default (search_articles, search_events, suggest_concepts, get_api_usage)
  - [x] Add `enable_toolset` meta-tool to toggle categories on/off with `tools/list_changed` notification

### Response truncation and summarization
- **Current**: `includeFields` parameter filters response fields (good), but full arrays still returned
- **Best practice**: Blockscout truncates hex strings, removes UI-only fields, caps list results at 10 items. Brave Search returns concise snippets.
- **Next steps**:
  - [x] Default `articlesCount`/`eventsCount` to 10 for MCP context (was 100/50)
  - [x] Strip fields that LLMs rarely need (internal IDs, raw URIs, duplicate metadata)
  - [x] Add a `detail_level` parameter (`minimal` | `standard` | `full`) — controls count + body truncation

---

## Response Formatting (P0)

### Structured but compact output
- **Current**: Raw API JSON passed through with optional field filtering
- **Best practice**: Server should reshape responses for LLM consumption — flatten nested structures, use human-readable labels, add continuation hints
- **Next steps**:
  - [x] For `search_articles`: return a numbered list with title, source, date, snippet instead of raw JSON
  - [x] For `suggest_*`: return a simple "name → URI" mapping, not full entity objects
  - [x] Include pagination hints: "Page X of Y. Use `articlesPage: N+1` for more."
  - [ ] Add result count to every paginated response

### Continuation patterns
- **Current**: Pagination via `articlesPage` / `eventsPage` params, but no guidance in responses
- **Best practice**: Responses should tell the LLM how to get more results
- **Next steps**:
  - [x] Append pagination metadata to every list response (page/pages + next page hint)
  - [x] Include example follow-up in response text when results are truncated

---

## MCP Features Not Used (P1)

### Resources
- **Current**: Not implemented
- **Best practice**: Use resources for static/semi-static context (API documentation, field descriptions, category taxonomies, example queries)
- **Next steps**:
  - [ ] Expose `newsapi://docs/fields` resource with field name descriptions
  - [ ] Expose `newsapi://docs/categories` with available category URIs
  - [ ] Expose `newsapi://docs/event-types` with event type taxonomy
  - [ ] Expose `newsapi://usage` as a dynamic resource showing current API quota

### Prompts
- **Current**: Not implemented
- **Best practice**: Prompts are workflow templates that guide the LLM through multi-step tasks
- **Next steps**:
  - [ ] Add `find-news` prompt: "Find recent news about {topic}" → suggests concepts → searches articles
  - [ ] Add `track-event` prompt: "Track developments about {event}" → find event → stream updates
  - [ ] Add `analyze-sentiment` prompt: "Analyze media sentiment about {entity}" → search → sentiment analysis
  - [ ] Add `compare-coverage` prompt: "Compare how sources cover {topic}" → multi-source search

### Sampling
- **Current**: Not implemented
- **Best practice**: Server-initiated LLM calls for summarization, classification, or query refinement
- **Next steps**:
  - [ ] Evaluate whether sampling would help for: auto-summarizing search results, suggesting better search queries, classifying user intent

---

## Error Handling (P1)

### Structured error responses
- **Current**: Basic try/catch with `error.message` extraction
- **Best practice**: Categorized errors with recovery guidance, retry hints, and alternative suggestions
- **Next steps**:
  - [ ] Categorize errors: `auth_error`, `rate_limit`, `invalid_param`, `not_found`, `api_error`
  - [ ] Include recovery guidance: "Rate limited. Retry after 60s." or "No results. Try broader search terms."
  - [ ] For `invalid_param` errors, suggest valid values (e.g., "Unknown lang code 'english'. Use 'eng'.")
  - [ ] Add `isRetryable` flag to error responses

### Graceful degradation
- **Current**: Errors stop the tool execution
- **Best practice**: Partial results with warnings are better than full failures
- **Next steps**:
  - [ ] If one concept in a multi-concept search fails, return results for successful concepts with a warning
  - [ ] If `includeFields` contains an invalid field, ignore it and note in response

---

## Caching (P1)

### Suggest results caching
- **Current**: No caching — every `suggest_*` call hits the API
- **Best practice**: Entity URIs rarely change. Cache suggest results to reduce API calls and latency.
- **Next steps**:
  - [ ] Add in-memory LRU cache for `suggest_*` results (TTL: 24h, max: 1000 entries)
  - [ ] Cache `get_api_usage` with medium TTL (15 min)
  - [ ] Consider persistent cache (SQLite/file) for suggest results across server restarts

### Semantic caching (P2)
- **Best practice**: Cache semantically similar queries (e.g., "Apple Inc" and "Apple company" → same URI)
- **Next steps**:
  - [ ] Normalize suggest queries (lowercase, trim, strip common suffixes like "Inc", "Corp")
  - [ ] Map common aliases to canonical URIs

---

## Tool Design (P1)

### Tool consolidation
- **Current**: 13 tools (reduced from 23 — removed streaming, analytics, and mentions tools)
- **Best practice**: Fewer focused tools reduce confusion. GitHub MCP uses ~10 tools. Brave Search uses 2.
- **Completed**:
  - [x] Removed `stream_articles` and `stream_events` (streaming use cases handled via `search_*` with date filters)
  - [x] Removed analytics tools (`annotate_text`, `categorize_text`, `analyze_sentiment`, `detect_language`, `compute_semantic_similarity`, `extract_article_info`)
  - [x] Removed `search_mentions` and `get_breaking_events`
- **Next steps**:
  - [ ] Evaluate merging all `suggest_*` tools (5 tools) into one `suggest` tool with a `type` parameter
  - [ ] Consider a unified `search` tool that auto-detects intent (articles vs events)

### Tool descriptions
- **Current**: Good descriptions with parameter docs
- **Best practice**: Include example invocations in descriptions, common parameter combinations, and "when to use this vs that" guidance
- **Next steps**:
  - [ ] Add 1-2 example invocations to each tool description
  - [ ] Add "Use this tool when..." guidance to disambiguate similar tools
  - [ ] Document common workflows in tool descriptions (e.g., "First use suggest_concepts, then search_articles")

---

## LLM Guidance & Workflow Documentation (P1)

### Server-level instructions
- **Current**: No `instructions` field set on `McpServer` constructor
- **Best practice**: The MCP SDK supports an `instructions` string that provides server-level guidance to LLM clients — purpose, core workflows, tips. Some clients ignore it, so critical guidance must stay in tool descriptions too.
- **Next steps**:
  - [ ] Add `instructions` string to `McpServer` constructor options in `src/index.ts` (~300 words)
  - [ ] Content should cover: server purpose, core suggest→search workflow, dynamic toolsets explanation, token optimization tips
  - [ ] Include summaries of the 5 workflow patterns (basic search, filtered search, event tracking, source-specific, topic monitoring)
  - [ ] Keep critical guidance duplicated in tool descriptions for clients that don't surface `instructions`

### Enhanced tool descriptions with examples
- **Current**: Good descriptions with parameter docs, but no example invocations or disambiguation guidance
- **Best practice**: Tool descriptions should include terse example invocations and "use this when / not this" guidance to help LLMs pick the right tool
- **Next steps**:
  - [ ] Add 1-2 example invocations per tool (one line each, showing key params)
  - [ ] Add "Use this when..." / "Not this..." disambiguation for similar tools:
    - `search_articles` vs `search_events`
    - `find_event_for_text` vs `search_events`
    - `get_article_details` vs `search_articles`
  - [ ] Follow structured template: `[What] / WORKFLOW / EXAMPLE / USE THIS WHEN / NOT THIS`
  - [ ] Files: `src/tools/articles.ts`, `events.ts`, `suggest.ts`, `topic-pages.ts`, `usage.ts`

### Enhanced `list_available_tools` output
- **Current**: Returns JSON listing categories and tool status
- **Best practice**: Meta-tool output should include workflow guidance and quick-start examples, not just a catalog
- **Next steps**:
  - [ ] Add workflow guidance section (suggest→search pattern) to output
  - [ ] Add quick-start example showing a typical 2-step search
  - [ ] Add token optimization tips (use `format: "text"`, `detail_level`, `articlesCount`)
  - [ ] Switch from JSON to formatted text output
  - [ ] File: `src/tools/registry.ts`

### MCP Resources for static documentation
- **Current**: Resources not implemented (tracked in MCP Features section above)
- **Best practice**: Resources provide static/semi-static context that LLMs can read on demand without burning tool calls
- **Next steps**:
  - [ ] `newsapi://guide` — comprehensive usage guide with all 5 workflow patterns
  - [ ] `newsapi://examples` — example queries for 7 common use cases (topic search, person tracking, event monitoring, source comparison, sentiment filtering, date-range search, multi-concept queries)
  - [ ] `newsapi://fields` — field reference (includeFields groups, detail_level presets, lang codes)
  - [ ] New file: `src/resources.ts`, registered from `src/index.ts`

### MCP Prompts for common workflows
- **Current**: Prompts not implemented (tracked in MCP Features section above)
- **Best practice**: Prompts are server-defined workflow templates that guide LLMs through multi-step tasks with structured arguments
- **Next steps**:
  - [ ] `find-news` — suggest → search → summarize
  - [ ] `track-event` — find_event_for_text → get_event_details → related articles
  - [ ] `compare-coverage` — multi-source search + comparison
  - [ ] New file: `src/prompts.ts`, registered from `src/index.ts`

### Workflow patterns to document across all guidance surfaces
Five canonical patterns to reference in instructions, tool descriptions, resources, and prompts:
1. **Basic search**: `suggest_concepts("Tesla")` → `search_articles(conceptUri: "...")`
2. **Filtered search**: `suggest_concepts` + `suggest_sources`/`suggest_categories` → `search_articles` with multiple filters
3. **Event tracking**: `find_event_for_text("...")` → `get_event_details` → `search_articles` for related coverage
4. **Source-specific**: `suggest_sources("Reuters")` → `search_articles(sourceUri: "...")`
5. **Topic monitoring**: `enable_toolset("topic_pages")` → `get_topic_page_articles(uri: "...")`

---

## API-Side Improvements (P2)

These require changes to the NewsAPI.ai backend, not just the MCP server.

### Dedicated MCP/LLM endpoint
- **Best practice**: API endpoint that returns pre-filtered, token-optimized responses designed for LLM consumption
- **Next steps**:
  - [ ] Evaluate a `/v1/mcp/search` endpoint that returns compact, pre-summarized results
  - [ ] Built-in article body truncation at the API level
  - [ ] Summary/excerpt mode that returns 2-3 sentence article summaries

### Batch operations
- **Current**: One entity lookup per suggest call
- **Next steps**:
  - [ ] Batch suggest endpoint: resolve multiple names to URIs in one call
  - [ ] Batch article details: fetch multiple articles by URI in one call (partially supported)

---

## References

- [MCP Official Docs — Servers](https://modelcontextprotocol.io/docs/concepts/servers)
- [Anthropic — Building Effective Agents](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-prompts-for-tools)
- [MCP Server Best Practices (community)](https://github.com/modelcontextprotocol/servers)
- [Blockscout MCP — Token optimization patterns](https://github.com/blockscout/mcp-server)
- [Brave Search MCP — Minimal tool surface](https://github.com/anthropics/anthropic-quickstarts)
