/**
 * Server-level instructions for LLM clients.
 * Provides high-level guidance on how to use the NewsAPI MCP server.
 */

export const serverInstructions = `NewsAPI MCP server provides access to Event Registry's global news database with 8 tools for searching articles, events, and entity lookup.

## Critical Workflow: suggest → search
ALWAYS resolve entity names to URIs before searching:
1. suggest({type: "concepts", prefix: "Tesla"}) → get conceptUri
2. search_articles({conceptUri: "<uri>"}) → search with URI

This ensures accurate results. Keyword search is a fallback, not the primary method.

## Retrieval Strategy
Results must fit in the model's context window. Start with what you need, then paginate for more.

**Initial retrieval:**
- Use detailLevel: "standard" (10 results) or "minimal" (5) for first query
- Set articleBodyLen: 200 if you only need headlines/summaries
- Add includeFields only for data you'll actually use

**If results are insufficient:**
- Paginate with articlesPage/eventsPage to retrieve the next batch
- Continue until you have enough relevant articles or exhaust available results

**When to retrieve more upfront:**
- Historical analysis requiring comprehensive coverage → detailLevel: "full"
- Time-critical breaking news → forceMaxDataTimeWindow: 7

## Workflow Patterns
1. **Topic search**: suggest(concepts) → search_articles(conceptUri)
2. **Person/org tracking**: suggest(concepts) → search_articles(conceptUri, dateStart)
3. **Source-specific**: suggest(sources) → search_articles(sourceUri)
4. **Country sources**: suggest(locations, "Slovenia") → search_articles(sourceLocationUri) for news from sources in that country
5. **Topic monitoring**: get_topic_page_articles(uri) for pre-configured searches

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
Track API consumption and report it after completing a task:
1. Call get_api_usage at the start and note the current token usage
2. Count each retrieval request (search_articles, get_article_details, search_events, get_event_details, get_topic_page_articles, get_topic_page_events). Do NOT count suggest or get_api_usage calls.
3. Call get_api_usage at the end to get updated token usage
4. Compute the exact difference (end − start) and report: "Made X requests to NewsAPI.ai that used Y tokens" — never estimate or round the token count

For detailed documentation, read the newsapi://guide resource.`;
