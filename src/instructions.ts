/**
 * Server-level instructions for LLM clients.
 * Provides high-level guidance on how to use the NewsAPI MCP server.
 */

export const serverInstructions = `NewsAPI MCP server provides access to Event Registry's global news database with 8 tools for searching articles, events, and entity lookup.

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

### When to simplify
- Quick lookups (known URI): go directly to get_article_details
- Topic page monitoring: use get_topic_page_articles
- Simple questions needing few results: search_articles with articlesCount: 10 (skip triage)

## Usage Tracking
Each response footer shows token cost (e.g., "Tokens used: 5 | Remaining: 950"); suggest calls are free (0 tokens).

## Sequential Requests
Make requests sequentially — do not fire multiple NewsAPI calls in parallel.

For detailed documentation, read the newsapi://guide resource.`;
