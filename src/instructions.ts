/**
 * Server-level instructions for LLM clients.
 * Provides high-level guidance on how to use the NewsAPI MCP server.
 */

export const serverInstructions = `NewsAPI MCP server provides access to Event Registry's global news database with 9 tools for searching articles, events, and entity lookup.

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
3. **Event monitoring**: find_event_for_text(text) → get_event_details → search_articles(eventUri)
4. **Source-specific**: suggest(sources) → search_articles(sourceUri)
5. **Country sources**: suggest(locations, "Slovenia") → search_articles(sourceLocationUri) for news from sources in that country
6. **Topic monitoring**: get_topic_page_articles(uri) for pre-configured searches

## Suggest Type Selection
- **concepts** (default): people, orgs, locations, products, general entities
- **categories**: news topics like "business", "technology", "sports"
- **sources**: news outlets (Reuters, BBC, CNN)
- **locations**: for locationUri or sourceLocationUri filters
- **authors**: journalist names for authorUri filter

For detailed documentation, read the newsapi://guide resource.`;
