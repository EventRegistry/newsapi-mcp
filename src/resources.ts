/**
 * MCP Resources for static documentation.
 * Provides detailed usage guides, examples, and reference material.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { REPORTING_RULES } from "./instructions.js";

// ============================================================================
// Guide Resource (~800 words)
// ============================================================================

export const GUIDE_CONTENT = `# NewsAPI MCP Server Guide

This server provides access to Event Registry's global news database covering 150,000+ sources in 100+ languages. The core suggest → scan → triage → retrieve workflow is described in the server instructions. This guide covers tool details and advanced patterns.

## Core Concepts

### Entity URIs
NewsAPI uses URIs to identify entities precisely. Raw text searches can be ambiguous, so always resolve names to URIs first using the suggest tool.

## The search tool
One tool, search, takes kind: "articles", "events" or "mentions" plus the same filters for all three (conceptUri, categoryUri, sourceUri, sourceLocationUri, keyword, dateStart/dateEnd, lang, ignore*, query, options). Paging is page, count and sortBy for every kind. Params the schema marks "<kind> only" are rejected for the other kinds.

### kind: "articles"
Individual articles with text. Sort: "date", "rel", "sourceImportance", "socialScore". articleBodyLen and isDuplicateFilter apply here only.

### kind: "events"
Events are clusters of related articles about the same real-world happening: one entry per story with a summary, article count and date. Use it for a high-level overview, deduplicated results or a summary of developments over a period. Sort: "date", "rel", "size" (article count), "socialScore". minArticlesInEvent / options.maxArticlesInEvent filter by event significance.

### Choosing Between Articles and Events
- **articles**: when you need full article text, specific source coverage, or individual stories
- **events**: when you need an overview, want deduplicated results, or the user asks "what's happening with X"

### Aggregates
Every kind accepts resultType. The default returns a page of results; an aggregate summarises all matches in one call and costs one search action:
- timeAggr: count per day (coverage over time)
- sourceAggr / authorAggr: who publishes most
- conceptAggr / categoryAggr / keywordAggr: what the coverage is about
- sentimentAggr: tone distribution
- locAggr: where it happens; langAggr (articles, mentions): which languages; eventTypeAggr (mentions): count per event type
Example: search({kind: "articles", conceptUri: "<uri>", dateStart: "2025-01-01", resultType: "timeAggr"})
Paging, sorting, includeFields and articleBodyLen do not apply to aggregates.

### kind: "mentions"
Sentences from articles that state a specific event type: a relation such as an acquisition, layoffs, a product launch, a recall or a natural disaster, about 100 types in all. Resolve the type first with suggest({type: "eventTypes", prefix: "acquisition"}), then filter with eventTypeUri plus conceptUri, sourceUri, dates, lang and sentiment. Each mention carries the sentence, its event type, sentiment, a link to the article and, with includeFields: "slots", the entities involved. Mention-only filters: factLevel ("fact", "opinion", "forecast") and, under options, industryUri, sdgUri, sasbUri, esgUri, minSentenceIndex / maxSentenceIndex, showDuplicates.
Example: search({kind: "mentions", eventTypeUri: "<uri>", conceptUri: "<uri>", dateStart: "2025-01-01", includeFields: "slots"})
Use it when the question names a kind of happening; kind: "articles" for general coverage of a topic.

### get_breaking_events
Events that are very recent, heavily covered and still accelerating, each with a breaking score. Takes no query; use it for "what is happening right now". breakingEventsMinBreakingScore (default 0.2) trims weaker stories.

## Response Control

### Default Values
- count: 50 (max 100 for articles and mentions, 50 for events; scans use 100)
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
- slots / frameworks (mentions only): entities in the sentence; SDG, ESG and SASB tags of the event type
- event: eventUri linking articles to events
- full: all available fields

### Token Optimization Tips
1. Always use scan→triage→retrieve for comprehensive queries: scan with count: 100, articleBodyLen: 0 (one row per article: # | uri | date | source | title; no URL), then retrieve only relevant articles via get_article_details
2. Use isDuplicateFilter: "skipDuplicates" in scan steps to remove wire syndication duplicates — this is the #1 triage efficiency improvement
3. Use forceMaxDataTimeWindow: 7 for "recent news" queries
4. In the retrieve step, request specific includeFields — avoid "full" unless you need everything
5. For simple questions needing few results, skip triage: use count: 10 directly

## Advanced Patterns

### Combining Filters
Multiple URIs can be comma-separated (concepts are ANDed by default, set conceptOper: "or" for any-of; categories, sources, languages are ORed):
search({
  kind: "articles",
  conceptUri: "uri1,uri2",
  categoryUri: "dmoz/Business",
  lang: "eng,deu"
})
Exclude with ignoreConceptUri, ignoreKeyword, ignoreSourceUri, ignoreLang.

### Boolean keyword expressions
One keyword string may be a boolean expression; the server switches keywordSearchMode to "exact" automatically:
search({kind: "articles", conceptUri: "<tesla>", keyword: "(recall OR lawsuit) NOT Musk", keywordLoc: "title"})
Operators: AND, OR, NOT, parentheses, "quoted phrase", NEAR/n (within n words, any order), NEXT/n (in order). Precedence: NEAR/NEXT > NOT > AND > OR.

### The query parameter
Use it only when the logic needs an OR across different fields or two independent OR-groups:
search({
  kind: "articles",
  query: {"$query": {"$and": [
    {"$or": [{"conceptUri": "<AI Act>"}, {"keyword": "Digital Services Act"}]},
    {"conceptUri": {"$or": ["<Meta>", "<Google>"]}}
  ], "$not": {"conceptUri": "<TikTok>"}}},
  lang: "eng", forceMaxDataTimeWindow: 31, articleBodyLen: 0
})
Rules: "$and"/"$or" hold a list of nodes; a leaf is an object of filter keys (several keys = AND); a value may be a string or {"$or": [...]}; "$not" sits next to "$and"/"$or" and holds one node (use {"$or": [...]} to exclude several). Flat params given with query are merged into it: filter keys are ANDed as one more leaf, ignore* become "$not", isDuplicateFilter/dataType/sentiment/rank go to "$filter".

### Cost of a search (API tokens)
| Search | last 31 days | 32–365 days | no date filter |
| articles (any count, any body length) | 1 | 5–10 | 65 |
| events | 5 | 20+ | 260 |
| aggregates | 5 | — | 130 |
get_article_details costs 1 per call (up to 100 URIs); suggest is free. Without a date filter the server searches the last 31 days and notes it under the result. A search that cost more than 1 token says why under the result; do not repeat it with reworded keywords.

### Date Ranges
Use dateStart and dateEnd in YYYY-MM-DD format:
search({
  kind: "articles",
  conceptUri: "<uri>",
  dateStart: "2025-01-01",
  dateEnd: "2025-01-31"
})

### Rare filters: the options object
Sentiment, source rank, authors, locations, source groups, extra exclusions and date mentions sit under options:
search({
  kind: "articles",
  conceptUri: "<uri>",
  options: { minSentiment: 0.3, endSourceRankPercentile: 30 }
})
Sentiment runs -1 (negative) to +1 (positive); source rank percentile 0 is the most important source, so endSourceRankPercentile: 30 keeps the top 30%.

## Error Recovery

### "Invalid parameter" errors
Check parameter names and values. Use suggest to get valid URIs.

### Rate limiting (429)
Daily quota exceeded. Wait until next day or reduce query frequency.

### Too many simultaneous requests (503)
Max 5 concurrent requests allowed. Always make requests sequentially — wait for each response before sending the next.

### No results
- Try a broader concept (e.g., "Olympic Games" instead of "2026 Winter Olympics")
- Combine broad concept + keyword for precision
- Use keyword search as fallback for recent/niche events
- Try broader date ranges or different languages
- Verify URIs are correct via suggest

## Usage Tracking
Each response footer shows: "Tokens used: N | Remaining: M". Use get_api_usage for full quota details.`;

// ============================================================================
// Examples Resource (~400 words)
// ============================================================================

export const EXAMPLES_CONTENT = `# NewsAPI MCP Examples

## 1. Full Workflow — "Recent AI news"
// Step 1: Suggest
suggest({type: "concepts", prefix: "artificial intelligence"})
// Step 2: Scan — titles only
search({
  kind: "articles",
  conceptUri: "<uri-from-suggest>",
  forceMaxDataTimeWindow: 7,
  lang: "eng",
  count: 100,
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
search({
  kind: "events",
  conceptUri: "<uri-from-suggest>",
  forceMaxDataTimeWindow: 31,
  count: 50,
  sortBy: "size"
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
search({
  kind: "articles",
  conceptUri: "<climate-uri>",
  sourceUri: "<reuters-uri>",
  count: 50,
  articleBodyLen: 0,
  isDuplicateFilter: "skipDuplicates"
})
search({
  kind: "articles",
  conceptUri: "<climate-uri>",
  sourceUri: "<bbc-uri>",
  count: 50,
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
search({
  kind: "articles",
  conceptUri: "<uri-from-suggest>",
  minSentiment: 0.3,
  count: 100,
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
search({
  kind: "articles",
  conceptUri: "<uri-from-suggest>",
  dateStart: "2025-01-01",
  dateEnd: "2025-01-31",
  lang: "eng",
  count: 100,
  articleBodyLen: 0,
  isDuplicateFilter: "skipDuplicates"
})
// Triage and retrieve relevant articles

## 6. Quick Lookup — simple question, few results needed
suggest({type: "concepts", prefix: "Elon Musk"})
search({
  kind: "articles",
  conceptUri: "<uri-from-suggest>",
  count: 10,
  forceMaxDataTimeWindow: 7
})

## 7. Multi-Concept — "Apple AND iPhone news"
suggest({type: "concepts", prefix: "Apple Inc"})
suggest({type: "concepts", prefix: "iPhone"})
search({
  kind: "articles",
  conceptUri: "<apple-uri>,<iphone-uri>",
  forceMaxDataTimeWindow: 7,
  count: 100,
  articleBodyLen: 0,
  isDuplicateFilter: "skipDuplicates"
})
// Triage and retrieve

## 8. Topic Page Monitoring
get_topic_page_articles({
  uri: "<topic-page-uri>",
  count: 5,
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
| count | 50 | 100 (events: 50) |
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

### sortBy for articles and mentions
- date: Publication date (default)
- rel: Relevance to query
- sourceImportance: Source authority rank
- sourceImportanceRank: Reverse of sourceImportance
- sourceAlexaGlobalRank: Global rank of the news source
- sourceAlexaCountryRank: Country rank of the news source
- socialScore: Social media engagement
- facebookShares: Facebook shares
  ⚠ Tip: socialScore may surface low-authority viral sources. Combine with startSourceRankPercentile/endSourceRankPercentile to ensure quality (e.g., endSourceRankPercentile: 30 for top 30% sources).

### sortBy for events
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

export function registerResources(server: McpServer, hosted = false): void {
  const guide = hosted
    ? `${GUIDE_CONTENT}\n\n${REPORTING_RULES}`
    : GUIDE_CONTENT;
  server.registerResource(
    "guide",
    "newsapi://guide",
    {
      description: "Comprehensive guide to using the NewsAPI MCP server",
      mimeType: "text/plain",
    },
    async () => ({
      contents: [
        { uri: "newsapi://guide", text: guide, mimeType: "text/plain" },
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
