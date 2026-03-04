/**
 * Server-level instructions for LLM clients.
 * Provides high-level guidance on how to use the NewsAPI MCP server.
 */

export const serverInstructions = `NewsAPI MCP server provides access to Event Registry's global news database with 8 tools for searching articles, events, and entity lookup.

## Critical Workflow: suggest → search
ALWAYS resolve entity names to URIs before searching:
1. suggest({type: "concepts", prefix: "Tesla"}) → get conceptUri
2. search_articles({conceptUri: "<uri>"}) or search_events({conceptUri: "<uri>"}) depending on need

This ensures accurate results. Keyword search is a fallback, not the primary method.

## Choosing Between Articles and Events
- **search_articles** → full article text, specific sources, detailed reporting, individual stories
- **search_events** → high-level overview, what happened, deduplicated event clusters, summary of developments

Use search_events when the user asks "what's happening with X", wants a summary of developments, or needs an overview. Use search_articles when they need full text, specific source coverage, or detailed reporting.

## Retrieval Strategy
Results must fit in the model's context window. Responses over ~100K characters are auto-truncated with a warning. Start with what you need, then paginate for more.

**Initial retrieval:**
- Default detailLevel is "extended" (50 results, 1000-char body previews) — good for most queries
- Use "standard" (10 results, full bodies) when you need complete article text for a small set
- Use "minimal" (5 results, 200-char bodies) for quick lookups
- Add includeFields only for data you'll actually use

**If results are insufficient:**
- Paginate with articlesPage/eventsPage to retrieve the next batch
- Continue until you have enough relevant articles or exhaust available results

**When to retrieve more upfront:**
- Historical analysis requiring comprehensive coverage → detailLevel: "extended" or "full"
- Time-critical breaking news → forceMaxDataTimeWindow: 7
- Use "full" only when complete article text is needed — may be truncated if response is too large

## Workflow Patterns
1. **Topic search**: suggest(concepts) → search_articles(conceptUri)
2. **Event overview**: suggest(concepts) → search_events(conceptUri) — for "what's happening with X" queries
3. **Person/org tracking**: suggest(concepts) → search_articles(conceptUri, dateStart)
4. **Event tracking**: suggest(concepts) → search_events(conceptUri, dateStart) — for tracking developments over time
5. **Source-specific**: suggest(sources) → search_articles(sourceUri)
6. **Country sources**: suggest(locations, "Slovenia") → search_articles(sourceLocationUri) for news from sources in that country
7. **Topic monitoring**: get_topic_page_articles(uri) for pre-configured searches

## Keyword Usage
- Each keyword value is matched as an **exact phrase** — multi-word strings like "tech layoffs" search for that exact phrase
- **Comma-separate individual terms** for word-level matching: keyword: "SaaS, acquisition, merger" (NOT "SaaS acquisition merger")
- Use keywordOper: "and" (default) to require all terms, or "or" to match any
- keywordLoc: "title,body" uses OR logic (matches in title OR body)

## Concept Selection
Concepts map to Wikipedia pages. Well-established pages have far better article coverage than recent or year-specific ones.

- **Prefer broad concepts**: "Winter Olympic Games" not "2026 Winter Olympics", "FIFA World Cup" not "2026 FIFA World Cup"
- **If a concept returns 0 or few results**, try a broader parent concept, or switch to keyword search
- **Combine broad concept + keyword for precision**: conceptUri: "Olympic Games" + keyword: "2026"

## Suggest Type Selection
- **concepts** (default): people, orgs, locations, products, general entities
- **categories**: news topics like "business", "technology", "sports"
- **sources**: news outlets (Reuters, BBC, CNN)
- **locations**: for locationUri or sourceLocationUri filters
- **authors**: journalist names for authorUri filter

**Language tips:**
- Always search in English first — it has the best coverage
- For non-English entities, only try the native language if English returns no results
- For locations, always use English names (e.g., "Germany" not "Deutschland")

## Usage Tracking
Each tool response includes a footer with token usage for that request and remaining quota (e.g., "Tokens used: 5 | Remaining: 49995").

**You MUST track and report usage:**
- Note the token count from each response as you work
- When you finish answering the user's question, include a usage summary:
  - Total NewsAPI requests made
  - Total tokens consumed (sum of all "Tokens used" values)
  - Remaining token quota

Use get_api_usage only when the user explicitly asks about quota or plan details.

For detailed documentation, read the newsapi://guide resource.`;
