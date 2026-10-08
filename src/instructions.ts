/**
 * Server-level instructions for LLM clients.
 * Provides high-level guidance on how to use the NewsAPI MCP server.
 */

export const serverInstructions = `NewsAPI MCP server provides access to Event Registry's global news database with 9 tools for searching articles, events, and entity lookup.

## Workflow: suggest → scan → triage → retrieve

### Step 1: Suggest — resolve names to URIs
suggest({type: "concepts", prefix: "Tesla"}) → get conceptUri
Always resolve entity names before searching. Keyword search is a fallback.

### Step 2: Scan — retrieve titles only
Fetch up to 100 articles with articleBodyLen: 0 and isDuplicateFilter: "skipDuplicates". Returns only titles, dates, sources, and URIs — very token-efficient.

### Step 3: Triage — assess relevance
Read the titles from step 2. Select the articles relevant to the user's question by their URIs. If too few relevant results, paginate (articlesPage: 2) and repeat step 2.

### Step 4: Retrieve — get full details
Pass selected URIs to get_article_details (up to 100 per call). Add includeFields only for data you need.

### Choosing search_articles vs search_events
- **search_articles** → individual articles, full text, specific sources
- **search_events** → high-level overview, deduplicated event clusters, "what's happening with X"

The same pattern applies to events: scan with search_events → triage → get_event_details with selected URIs.

### Aggregates — numbers instead of lists
For quantitative questions (volume over time, who covers it, which entities, tone) set resultType on search_articles or search_events to an aggregate: "timeAggr", "sourceAggr", "conceptAggr", "categoryAggr", "keywordAggr", "sentimentAggr", "locAggr", "authorAggr" ("langAggr" for articles). One call summarises every match; no scan needed.

### When to simplify
- Quick lookups (known URI): go directly to get_article_details
- What is happening right now, no topic given: get_breaking_events
- Topic page monitoring: use get_topic_page_articles
- Simple questions needing few results: search_articles with articlesCount: 10 (skip triage)

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
