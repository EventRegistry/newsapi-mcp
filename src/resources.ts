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

### The suggest → search Workflow
This is the most important pattern:

1. **Resolve entity**: Call suggest with the entity name
   suggest({type: "concepts", prefix: "Apple Inc"})

2. **Get URI**: Extract the URI from results
   "http://en.wikipedia.org/wiki/Apple_Inc."

3. **Search with URI**: Pass URI to search tools
   search_articles({conceptUri: "http://en.wikipedia.org/wiki/Apple_Inc."})

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

### search_events
Events are clusters of related articles about the same real-world happening.
Use when you need high-level summaries rather than individual articles.

## Response Control

### detailLevel Presets
- **minimal**: 5 results, 200-character bodies (fastest, cheapest)
- **standard**: 10 results, full bodies (default)
- **full**: 50 articles or 20 events, full bodies

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
1. Start with detailLevel: "minimal" and increase if needed
2. Use forceMaxDataTimeWindow: 7 for "recent news" queries
3. Set articleBodyLen: 0 if you only need titles
4. Request specific includeFields rather than "full"

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

### No results
- Try a broader concept (e.g., "Olympic Games" instead of "2026 Winter Olympics")
- Combine broad concept + keyword for precision
- Use keyword search as fallback for recent/niche events
- Try broader date ranges or different languages
- Verify URIs are correct via suggest`;

// ============================================================================
// Examples Resource (~400 words)
// ============================================================================

export const EXAMPLES_CONTENT = `# NewsAPI MCP Examples

## 1. Topic Search — "Recent AI news"
suggest({type: "concepts", prefix: "artificial intelligence"})
search_articles({
  conceptUri: "<uri-from-suggest>",
  forceMaxDataTimeWindow: 7,
  lang: "eng",
  detailLevel: "minimal"
})

## 2. Person Tracking — "News about Elon Musk"
suggest({type: "concepts", prefix: "Elon Musk"})
search_articles({
  conceptUri: "<uri-from-suggest>",
  dateStart: "2025-01-01",
  articlesSortBy: "date"
})

## 3. Source Comparison — "How Reuters vs BBC cover climate"
suggest({type: "sources", prefix: "Reuters"})
suggest({type: "sources", prefix: "BBC"})
suggest({type: "concepts", prefix: "climate change"})
search_articles({
  conceptUri: "<climate-uri>",
  sourceUri: "<reuters-uri>",
  detailLevel: "minimal"
})
search_articles({
  conceptUri: "<climate-uri>",
  sourceUri: "<bbc-uri>",
  detailLevel: "minimal"
})

## 4. Sentiment Filtering — "Positive news about Tesla"
suggest({type: "concepts", prefix: "Tesla"})
search_articles({
  conceptUri: "<uri-from-suggest>",
  minSentiment: 0.3,
  includeFields: "sentiment"
})

## 5. Date Range Search — "Bitcoin news in January 2025"
suggest({type: "concepts", prefix: "Bitcoin"})
search_articles({
  conceptUri: "<uri-from-suggest>",
  dateStart: "2025-01-01",
  dateEnd: "2025-01-31",
  lang: "eng"
})

## 6. Multi-Concept Query — "Apple AND iPhone news"
suggest({type: "concepts", prefix: "Apple Inc"})
suggest({type: "concepts", prefix: "iPhone"})
search_articles({
  conceptUri: "<apple-uri>,<iphone-uri>",
  forceMaxDataTimeWindow: 7
})

## Common Patterns

### Get article details by URI
get_article_details({
  articleUri: "123456789",
  includeFields: "concepts,sentiment"
})

### Get event cluster details
get_event_details({
  eventUri: "eng-1234567",
  includeFields: "concepts,categories"
})

### Monitor a pre-configured topic
get_topic_page_articles({
  uri: "<topic-page-uri>",
  detailLevel: "minimal"
})

### Check API quota
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

## detailLevel Presets

| Level | Articles | Events | Body Length |
|-------|----------|--------|-------------|
| minimal | 5 | 5 | 200 chars |
| standard | 10 | 10 | full |
| full | 100 | 50 | full |

Explicit params (articlesCount, articleBodyLen) override presets.

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
- socialScore: Social media engagement

### eventsSortBy
- date: Event date (default)
- rel: Relevance to query
- size: Number of articles in cluster
- socialScore: Social engagement

## Source Rank Percentiles

Filter by source importance (0 = most important, 100 = least):
- startSourceRankPercentile: 0
- endSourceRankPercentile: 30

This returns only top 30% most authoritative sources.

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
      description: "Reference for includeFields, detailLevel, and other params",
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
