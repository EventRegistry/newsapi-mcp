/**
 * MCP Resources for static documentation.
 * Provides detailed usage guides, examples, and reference material.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// ============================================================================
// Guide Resource (~800 words)
// ============================================================================

export const GUIDE_CONTENT = `# NewsAPI MCP Server Guide

This server provides access to Event Registry's global news database covering 150,000+ sources in 100+ languages.

## Core Concepts

### Entity URIs
NewsAPI uses URIs to identify entities precisely. Raw text searches can be ambiguous, so always resolve names to URIs first using the suggest tool.

### The suggest → scan → triage → retrieve Workflow
This is the most important pattern. It separates cheap discovery from expensive retrieval.

**Step 1: Suggest** — resolve entity names to URIs:
suggest({type: "concepts", prefix: "Apple Inc"})
→ returns URI: "http://en.wikipedia.org/wiki/Apple_Inc."

**Step 2: Scan** — fetch titles only (no bodies):
search_articles({
  conceptUri: "http://en.wikipedia.org/wiki/Apple_Inc.",
  articlesCount: 100,
  articleBodyLen: 0,
  isDuplicateFilter: "skipDuplicates"
})
This returns up to 100 article titles, dates, sources, and URIs with minimal token cost. Use isDuplicateFilter: "skipDuplicates" to eliminate wire syndication duplicates that clutter triage.

**Step 3: Triage** — read the titles and select relevant articles by URI. If too few results are relevant, paginate with articlesPage: 2 and scan again.

**Step 4: Retrieve** — get full details for selected articles:
get_article_details({
  articleUri: ["<uri1>", "<uri2>", "<uri3>"]
})
Pass up to 100 URIs per call. For more than 100 articles, batch into multiple calls. Add includeFields only for data you need.

The same pattern works for events: scan with search_events (articleBodyLen: 0) → triage → get_event_details with selected URIs.

get_event_details supports a resultType param: "info" (default, supports multiple URIs), "articles", "articleUris", "similarEvents" (single URI only).

### Suggest Types Explained

**concepts** (most common)
Use for people, organizations, locations, products, or any named entity.
Examples: "Elon Musk", "Tesla", "Paris", "iPhone", "COVID-19"

**categories**
Use for news topic categories defined by DMOZ/IPTC taxonomy.
Examples: "business", "technology", "sports", "politics"
Returns URIs like "dmoz/Business/Investing" or "news/Technology"

**sources**
Use for specific news outlets or publishers.
Examples: "Reuters", "BBC", "New York Times", "TechCrunch"

**locations**
Use when you specifically need geographic filtering:
- locationUri: filter by locations mentioned in articles
- sourceLocationUri: filter by where the news source is based

**authors**
Use for journalist bylines when tracking specific reporters.

## Search Tools

### search_articles
Primary tool for finding news articles. Supports filtering by:
- conceptUri, categoryUri, sourceUri, locationUri, authorUri
- keyword (secondary filter, use with conceptUri)
- dateStart, dateEnd (YYYY-MM-DD format)
- lang (ISO codes: "eng", "deu", "fra", "slv", etc.)
- sentiment range (minSentiment, maxSentiment: -1 to 1)

**Keyword matching**:
- Each keyword value is matched as an exact phrase
- Comma-separate individual terms for word-level matching: keyword: "SaaS, acquisition, merger" (NOT "SaaS acquisition merger")
- Use keywordOper for AND/OR logic between comma-separated terms
- keywordLoc: "title,body" uses OR (matches in either location)

### search_events
Events are clusters of related articles about the same real-world happening. Each event groups all articles covering the same story into one entry with a summary, article count, and date.

Use search_events when you need:
- A high-level overview of what's happening with a topic
- Deduplicated results (one entry per story, not per article)
- Summary of developments over a time period
- Quick scan of major happenings without reading full articles

Supports the same filters as search_articles:
- conceptUri, categoryUri, sourceUri, locationUri, authorUri
- keyword, dateStart, dateEnd, lang, sentiment range
- eventsSortBy: "date", "rel", "size" (article count), "socialScore"
- minArticlesInEvent / maxArticlesInEvent to filter by event significance

Example:
search_events({
  conceptUri: "<uri>",
  forceMaxDataTimeWindow: 31,
  eventsSortBy: "size"
})

### Choosing Between Articles and Events
- **search_articles**: when you need full article text, specific source coverage, or individual stories
- **search_events**: when you need an overview, want deduplicated results, or the user asks "what's happening with X"

## Response Control

### Default Values
- articlesCount: 100 (max per page)
- eventsCount: 50 (max per page)
- articleBodyLen: 1000 (character preview; use -1 for full text, 0 to exclude body)

### includeFields Groups
Request additional data beyond the minimal set:
- sentiment: article/event sentiment score
- concepts: mentioned entities
- categories: topic classifications
- images: article images
- authors: byline information
- location: geographic data
- social: share counts
- metadata: relevance scores, language, timestamps
- event: eventUri linking articles to events
- full: all available fields

### Token Optimization Tips
1. Always use scan→triage→retrieve for comprehensive queries: scan with articlesCount: 100, articleBodyLen: 0, then retrieve only relevant articles via get_article_details
2. Use isDuplicateFilter: "skipDuplicates" in scan steps to remove wire syndication duplicates — this is the #1 triage efficiency improvement
3. Use forceMaxDataTimeWindow: 7 for "recent news" queries
4. In the retrieve step, request specific includeFields — avoid "full" unless you need everything
5. For simple questions needing few results, skip triage: use articlesCount: 10 directly

## Advanced Patterns

### Combining Filters
Multiple URIs can be comma-separated:
search_articles({
  conceptUri: "uri1,uri2",
  categoryUri: "dmoz/Business",
  lang: "eng,deu"
})

### Date Ranges
Use dateStart and dateEnd in YYYY-MM-DD format:
search_articles({
  conceptUri: "<uri>",
  dateStart: "2025-01-01",
  dateEnd: "2025-01-31"
})

### Sentiment Analysis
Filter by article sentiment (-1 negative to +1 positive):
search_articles({
  conceptUri: "<uri>",
  minSentiment: 0.3
})

### Source Quality Filtering
Filter by source importance percentile (0-100, lower = more important):
search_articles({
  conceptUri: "<uri>",
  startSourceRankPercentile: 0,
  endSourceRankPercentile: 30
})

## Error Recovery

### "Invalid parameter" errors
Check parameter names and values. Use suggest to get valid URIs.

### Rate limiting (429)
Daily quota exceeded. Wait until next day or reduce query frequency.

### Too many simultaneous requests (503)
Max 5 concurrent requests allowed. Make requests sequentially — wait for each response before sending the next.

### No results
- Try a broader concept (e.g., "Olympic Games" instead of "2026 Winter Olympics")
- Combine broad concept + keyword for precision
- Use keyword search as fallback for recent/niche events
- Try broader date ranges or different languages
- Verify URIs are correct via suggest

## Usage Tracking
Each tool response includes a footer with token usage for that request (e.g., "Tokens used: 5"). The suggest tool is free and costs 0 tokens — its footer will show "Tokens used: 0".

**You MUST track and report usage at the end of every response:**
- Count every NewsAPI tool call you make (including suggest calls)
- Read the exact "Tokens used" number from each response footer — do not estimate or count requests as tokens
- Include a usage summary in this exact format:

**NewsAPI usage:** {N} requests | {T} tokens consumed

Example: **NewsAPI usage:** 4 requests | 2 tokens consumed

Use get_api_usage only when the user explicitly asks about quota or plan details.`;

// ============================================================================
// Examples Resource (~400 words)
// ============================================================================

export const EXAMPLES_CONTENT = `# NewsAPI MCP Examples

## 1. Full Workflow — "Recent AI news"
// Step 1: Suggest
suggest({type: "concepts", prefix: "artificial intelligence"})
// Step 2: Scan — titles only
search_articles({
  conceptUri: "<uri-from-suggest>",
  forceMaxDataTimeWindow: 7,
  lang: "eng",
  articlesCount: 100,
  articleBodyLen: 0,
  isDuplicateFilter: "skipDuplicates"
})
// Step 3: Triage — read titles, pick relevant URIs
// Step 4: Retrieve — get full text for selected articles
get_article_details({
  articleUri: ["<uri1>", "<uri2>", "<uri3>"]
})

## 2. Event Workflow — "What's happening with climate?"
suggest({type: "concepts", prefix: "climate change"})
// Scan events
search_events({
  conceptUri: "<uri-from-suggest>",
  forceMaxDataTimeWindow: 31,
  eventsCount: 50,
  eventsSortBy: "size"
})
// Triage — pick relevant event URIs
// Retrieve full event details
get_event_details({
  eventUri: ["<event-uri1>", "<event-uri2>"],
  includeFields: "concepts,categories"
})

## 3. Source Comparison — "How Reuters vs BBC cover climate"
suggest({type: "sources", prefix: "Reuters"})
suggest({type: "sources", prefix: "BBC"})
suggest({type: "concepts", prefix: "climate change"})
// Scan from each source
search_articles({
  conceptUri: "<climate-uri>",
  sourceUri: "<reuters-uri>",
  articlesCount: 50,
  articleBodyLen: 0,
  isDuplicateFilter: "skipDuplicates"
})
search_articles({
  conceptUri: "<climate-uri>",
  sourceUri: "<bbc-uri>",
  articlesCount: 50,
  articleBodyLen: 0,
  isDuplicateFilter: "skipDuplicates"
})
// Triage — pick articles from each source
// Retrieve full text for comparison
get_article_details({
  articleUri: ["<reuters-article1>", "<bbc-article1>", "..."]
})

## 4. Sentiment Filtering — "Positive news about Tesla"
suggest({type: "concepts", prefix: "Tesla"})
search_articles({
  conceptUri: "<uri-from-suggest>",
  minSentiment: 0.3,
  articlesCount: 100,
  articleBodyLen: 0,
  isDuplicateFilter: "skipDuplicates"
})
// Triage and retrieve with sentiment data
get_article_details({
  articleUri: ["<uri1>", "<uri2>"],
  includeFields: "sentiment"
})

## 5. Date Range — "Bitcoin news in January 2025"
suggest({type: "concepts", prefix: "Bitcoin"})
search_articles({
  conceptUri: "<uri-from-suggest>",
  dateStart: "2025-01-01",
  dateEnd: "2025-01-31",
  lang: "eng",
  articlesCount: 100,
  articleBodyLen: 0,
  isDuplicateFilter: "skipDuplicates"
})
// Triage and retrieve relevant articles

## 6. Quick Lookup — simple question, few results needed
suggest({type: "concepts", prefix: "Elon Musk"})
search_articles({
  conceptUri: "<uri-from-suggest>",
  articlesCount: 10,
  forceMaxDataTimeWindow: 7
})

## 7. Multi-Concept — "Apple AND iPhone news"
suggest({type: "concepts", prefix: "Apple Inc"})
suggest({type: "concepts", prefix: "iPhone"})
search_articles({
  conceptUri: "<apple-uri>,<iphone-uri>",
  forceMaxDataTimeWindow: 7,
  articlesCount: 100,
  articleBodyLen: 0,
  isDuplicateFilter: "skipDuplicates"
})
// Triage and retrieve

## 8. Topic Page Monitoring
get_topic_page_articles({
  uri: "<topic-page-uri>",
  articlesCount: 5,
  articleBodyLen: 200
})

## 9. Batch Article Retrieval
// Retrieve up to 100 articles per call
get_article_details({
  articleUri: ["123456789", "987654321", "456789123", "..."],
  includeFields: "concepts,sentiment"
})

## 10. Check API Quota
get_api_usage({})`;

// ============================================================================
// Fields Reference Resource (~300 words)
// ============================================================================

export const FIELDS_CONTENT = `# NewsAPI Fields Reference

## includeFields Groups

| Group | Articles | Events | Description |
|-------|----------|--------|-------------|
| sentiment | Yes | Yes | Sentiment score (-1 to +1) |
| concepts | Yes | Yes | Mentioned entities with URIs |
| categories | Yes | Yes | Topic classifications |
| images | Yes | Yes | Image URLs |
| authors | Yes | No | Article bylines |
| location | Yes | Yes | Geographic data |
| social | Yes | Yes | Share counts |
| metadata | Yes | Yes | Relevance, language, timestamps |
| event | Yes | No | Links article to event cluster |
| full | Yes | Yes | All available fields |

Default (no includeFields): title, body, date, source, URL

## Default Values

| Parameter | Default | Max |
|-----------|---------|-----|
| articlesCount | 100 | 100 |
| eventsCount | 50 | 50 |
| articleBodyLen | 1000 | -1 (full text) |

Set articleBodyLen: 0 to exclude body, -1 for full text.

## Language Codes (ISO 639-2)

56 supported languages:

**Western European:**
cat (Catalan), deu (German), eng (English), eus (Basque), fra (French),
glg (Galician), gle (Irish), isl (Icelandic), ita (Italian), nld (Dutch),
nor (Norwegian), por (Portuguese), spa (Spanish), swe (Swedish)

**Central/Eastern European:**
bul (Bulgarian), ces (Czech), est (Estonian), hrv (Croatian), hun (Hungarian),
lav (Latvian), lit (Lithuanian), pol (Polish), ron (Romanian), rus (Russian),
slk (Slovak), slv (Slovenian), sqi (Albanian), srp (Serbian), ukr (Ukrainian),
hbs (Serbo-Croatian)

**Nordic/Baltic:**
dan (Danish), fin (Finnish)

**Middle Eastern:**
ara (Arabic), heb (Hebrew), tur (Turkish)

**South Asian:**
hin (Hindi), kan (Kannada), mal (Malayalam), mar (Marathi), pan (Punjabi),
tam (Tamil), tel (Telugu), urd (Urdu)

**East Asian:**
jpn (Japanese), kor (Korean), zho (Chinese), zsm (Malay Standard)

**Southeast Asian:**
ind (Indonesian), msa (Malay), tgl (Tagalog), tha (Thai), vie (Vietnamese)

**Other:**
ell (Greek), kat (Georgian), swa (Swahili), zul (Zulu)

Use comma-separated for multiple: lang: "eng,deu,fra"

## Sort Options

### articlesSortBy
- date: Publication date (default)
- rel: Relevance to query
- sourceImportance: Source authority rank
- sourceImportanceRank: Reverse of sourceImportance
- sourceAlexaGlobalRank: Global rank of the news source
- sourceAlexaCountryRank: Country rank of the news source
- socialScore: Social media engagement
- facebookShares: Facebook shares
  ⚠ Tip: socialScore may surface low-authority viral sources. Combine with startSourceRankPercentile/endSourceRankPercentile to ensure quality (e.g., endSourceRankPercentile: 30 for top 30% sources).

### eventsSortBy
- date: Event date (default)
- rel: Relevance to the query
- size: Number of articles in the event
- socialScore: Amount of shares in social media

## Source Rank Percentiles

Filter by source importance (0 = most important, 100 = least):
- startSourceRankPercentile: 0
- endSourceRankPercentile: 30

This returns only top 30% most authoritative sources.

## Date Mentions

dateMentionStart and dateMentionEnd filter articles that mention specific dates in their content (not publication date).

⚠ **Quirk:** Using both dateMentionStart and dateMentionEnd together often returns 0 results. Prefer using dateMentionStart alone to find articles mentioning dates on or after a given date.

## Sentiment Values

Range: -1 (very negative) to +1 (very positive)
- minSentiment: 0.3 (positive news only)
- maxSentiment: -0.3 (negative news only)
- Combined for neutral: minSentiment: -0.2, maxSentiment: 0.2`;

// ============================================================================
// Resource Registration
// ============================================================================

export function registerResources(server: McpServer): void {
  server.registerResource(
    "guide",
    "newsapi://guide",
    {
      description: "Comprehensive guide to using the NewsAPI MCP server",
      mimeType: "text/plain",
    },
    async () => ({
      contents: [
        { uri: "newsapi://guide", text: GUIDE_CONTENT, mimeType: "text/plain" },
      ],
    }),
  );

  server.registerResource(
    "examples",
    "newsapi://examples",
    {
      description: "Example tool calls for common NewsAPI use cases",
      mimeType: "text/plain",
    },
    async () => ({
      contents: [
        {
          uri: "newsapi://examples",
          text: EXAMPLES_CONTENT,
          mimeType: "text/plain",
        },
      ],
    }),
  );

  server.registerResource(
    "fields",
    "newsapi://fields",
    {
      description: "Reference for includeFields, defaults, and other params",
      mimeType: "text/plain",
    },
    async () => ({
      contents: [
        {
          uri: "newsapi://fields",
          text: FIELDS_CONTENT,
          mimeType: "text/plain",
        },
      ],
    }),
  );
}
