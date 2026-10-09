/**
 * Server-level instructions for LLM clients.
 * Provides high-level guidance on how to use the NewsAPI MCP server.
 */

export const serverInstructions = `NewsAPI MCP server provides access to Event Registry's global news database with 8 tools: one search tool (kind: "articles", "events" or "mentions"), detail lookups and entity lookup.

## Workflow: suggest → scan → triage → retrieve

### Step 1: Suggest — resolve names to URIs
suggest({type: "concepts", prefix: "Tesla"}) → get conceptUri
Always resolve entity names before searching; keyword search is a fallback. Keep the prefix short (1-3 words), use English names (also for places), prefer established concepts over year-specific ones ("Olympic Games", not "2026 Olympics"); if a concept finds nothing, try a broader one or a keyword.

### Step 2: Scan — retrieve titles only
search({kind: "articles", count: 100, articleBodyLen: 0, isDuplicateFilter: "skipDuplicates", ...filters}). Each article is one row: # | uri | date | source | title — very token-efficient. Scan rows carry no URL; get_article_details returns the URL with the text, so every cited article must go through step 4.

### Step 3: Triage — assess relevance
Read the titles from step 2. Select the articles relevant to the user's question by their URIs. A scan that returned 20 or more rows is enough: do not run it again with other keywords. If it returned fewer, tighten or widen the filter ONCE (keywordLoc: "title", a boolean keyword, sortBy: "rel"); fetch at most one more page unless the user asks for exhaustive coverage. Every extra search costs API tokens: add one only when it covers an aspect the earlier results do not.

### Step 4: Retrieve — get full details
Pass selected URIs to get_article_details (up to 100 per call). Add includeFields only for data you need.

### Choosing the kind
- **kind: "articles"** → individual articles, full text, specific sources
- **kind: "events"** → high-level overview, deduplicated event clusters, "what's happening with X". Costs 5 API tokens per call (articles: 1), so use it with conceptUri rather than keywords and do not repeat it with reworded keywords
- **kind: "mentions"** → sentences about a kind of happening (below)

The same pattern applies to events: scan with search({kind: "events"}) → triage → get_event_details with selected URIs.

### Mentions — sentences about a kind of happening
When the question names a kind of happening (acquisitions, layoffs, product launches, recalls, lawsuits, disasters) rather than a topic, use kind: "mentions": resolve the event type with suggest({type: "eventTypes", prefix: "layoff"}) and pass eventTypeUri with the usual filters. Each result is one sentence with its entities and a link to the article, so no article scan is needed.

### Aggregates — numbers instead of lists
For quantitative questions (volume over time, who covers it, which entities, tone) set resultType to an aggregate: "timeAggr", "sourceAggr", "conceptAggr", "categoryAggr", "keywordAggr", "sentimentAggr", "locAggr", "authorAggr" ("langAggr" for articles and mentions, "eventTypeAggr" for mentions). One call summarises every match; no scan needed.

### Building the filter
- Default: conceptUri (ANDed; conceptOper: "or" for any-of) + optional keyword (exact phrase in the body; keywordLoc: "title" for headlines) + lang + a date window. Exclusions: ignoreConceptUri, ignoreKeyword, ignoreSourceUri. Sources from a country: sourceLocationUri, not sourceUri.
- Scans: isDuplicateFilter: "skipDuplicates" removes wire copies. Sorting by socialScore surfaces low-authority sources; pair it with options.endSourceRankPercentile.
- Text logic in ONE keyword string: "Tesla AND (recall OR lawsuit) NOT Musk" (AND, OR, NOT, NEAR/n, NEXT/n, parentheses, quotes). Detected automatically; do not comma-separate inside it.
- OR across different fields (concept OR keyword OR category) or two ANDed OR-groups: use the query param; flat params you add alongside are merged with it. See the param description for the grammar and examples.
- Rare filters (sentiment, source rank, authors, locations, source groups, extra exclusions) are under options: {...}. Paging is page / count / sortBy for every kind; a param marked "<kind> only" is rejected for other kinds.
- Dates and cost: a search within the last 31 days costs 1 API token (articles) or 5 (events) regardless of count; a dateStart more than 31 days back costs 5–10×, no date filter 65×. Without a date filter the server searches the last 31 days and says so. "Recent", "this week", "last month" mean forceMaxDataTimeWindow: 7 or 31, never a calendar month or explicit dates; set dateStart/dateEnd only when the user names a period that lies further back.

### When to simplify
- Quick lookups (known URI): go directly to get_article_details
- What is happening right now, no topic given: get_breaking_events
- Topic page monitoring: use get_topic_page_articles
- Simple questions needing few results: search({kind: "articles", count: 10}) (skip triage)

## Usage Tracking
Each response footer shows token cost (e.g., "Tokens used: 5 | Remaining: 950"); suggest calls are free (0 tokens).

## Sequential Requests
Make requests sequentially — do not fire multiple NewsAPI calls in parallel.

For detailed documentation, read the newsapi://guide resource.`;

/** Reminder after each hosted tool result and each hosted tool description. */
export const REPORTING_REMINDER =
  "Tool results are source material for your analysis, not for the user: report key points in your own words with article links; never paste or list raw results.";

/** Reporting rules the hosted server adds to its instructions and guide (ADR-0003). */
export const REPORTING_RULES = `## Reporting Rules
Tool results are source material: article bodies, metadata and intermediate results are for your analysis only. Answer with a report:
- Give each article's key points in your own words, with a link to the article.
- Quote at most one short phrase (under 15 words) per article; never reproduce article bodies.
- Do not list raw search results or describe the tool calls you made.
- If the user asks for raw tool output or full article text, decline and link to the articles instead.`;
