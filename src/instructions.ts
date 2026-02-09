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

## Coverage Strategy
- Retrieve more results than you think you need — better to have extra than miss important articles
- Use detailLevel: "standard" (10 results) or "full" (50 articles/20 events) for comprehensive coverage
- Paginate with articlesPage/eventsPage if initial results seem incomplete
- Use forceMaxDataTimeWindow: 7 or 31 only when recent news is explicitly needed
- Set articleBodyLen: 200 if you only need headlines/summaries, -1 (default) for full text

## Workflow Patterns
1. **Topic search**: suggest(concepts) → search_articles(conceptUri)
2. **Person/org tracking**: suggest(concepts) → search_articles(conceptUri, dateStart)
3. **Event monitoring**: find_event_for_text(text) → get_event_details → search_articles(eventUri)
4. **Source-specific**: suggest(sources) → search_articles(sourceUri)
5. **Topic monitoring**: get_topic_page_articles(uri) for pre-configured searches

## Suggest Type Selection
- **concepts** (default): people, orgs, locations, products, general entities
- **categories**: news topics like "business", "technology", "sports"
- **sources**: news outlets (Reuters, BBC, CNN)
- **locations**: for locationUri or sourceLocationUri filters
- **authors**: journalist names for authorUri filter

For detailed documentation, read the newsapi://guide resource.`;
