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
search_articles({
  conceptUri: "<uri>",
  articlesCount: 100,
  articleBodyLen: 0
})
Fetch up to 100 articles with NO bodies — returns only titles, dates, sources, and URIs. Very token-efficient. Do NOT use detailLevel here; set articlesCount and articleBodyLen explicitly.

### Step 3: Triage — assess relevance
Read the titles from step 2. Select the articles relevant to the user's question by their URIs. If too few relevant results, paginate (articlesPage: 2) and repeat step 2.

### Step 4: Retrieve — get full details
get_article_details({
  articleUri: ["<uri1>", "<uri2>", "<uri3>", ...]
})
Pass up to 100 URIs per call. If you have more than 100 relevant articles, batch them into multiple calls of 100 URIs each. Add includeFields only for data you need.

### Choosing search_articles vs search_events
- **search_articles** → individual articles, full text, specific sources
- **search_events** → high-level overview, deduplicated event clusters, "what's happening with X"

The same pattern applies to events: scan with search_events → triage → get_event_details with selected URIs.

### When to simplify
- Quick lookups (known URI): go directly to get_article_details
- Topic page monitoring: use get_topic_page_articles
- Simple questions needing few results: search_articles with articlesCount: 10 (skip triage)

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
Each tool response includes a footer with token usage for that request (e.g., "Tokens used: 5"). The suggest tool is free and costs 0 tokens — its footer will show "Tokens used: 0".

**You MUST track and report usage at the end of every response:**
- Count every NewsAPI tool call you make (including suggest calls)
- Read the exact "Tokens used" number from each response footer — do not estimate or count requests as tokens
- Include a usage summary in this exact format:

**NewsAPI usage:** {N} requests | {T} tokens consumed

Example: **NewsAPI usage:** 4 requests | 6 tokens consumed

Use get_api_usage only when the user explicitly asks about quota or plan details.

## Sequential Requests
Event Registry allows max 5 concurrent requests. Always make requests sequentially — wait for each response before sending the next. Do not fire multiple NewsAPI tool calls in parallel.

For detailed documentation, read the newsapi://guide resource.`;
