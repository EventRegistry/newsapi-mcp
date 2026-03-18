---
name: news
description: Research news topics using NewsAPI tools. Use when the user asks about current events, news analysis, source comparison, topic monitoring, due diligence, company intelligence, supply chain risk, or geopolitical risk.
user-invocable: true
allowed-tools: mcp__newsapi__suggest, mcp__newsapi__search_articles, mcp__newsapi__search_events, mcp__newsapi__get_article_details, mcp__newsapi__get_event_details, mcp__newsapi__get_topic_page_articles, mcp__newsapi__get_topic_page_events, mcp__newsapi__get_api_usage
---

# News Research Skill

Research news topics end-to-end using the NewsAPI MCP server. This skill orchestrates the right tool sequence for different question types and formats findings for export.

## Usage

- `/news "What's happening with AI regulation?"` — run a full research workflow
- `/news` — interactive mode, asks for the research question

## Rules

1. **Sequential requests only** — never fire multiple NewsAPI calls in parallel (max 5 concurrent allowed by API, but sequential is safer and required by server instructions)
2. **Deduplicate by default** — use `isDuplicateFilter: "skipDuplicates"` in all scan steps
3. **Track usage** — read the "Tokens used" footer from every response and report totals at the end

## Workflow: suggest → scan → triage → retrieve

### Step 1: Suggest — resolve names to URIs
`suggest({type: "concepts", prefix: "Tesla"})` → get conceptUri
Always resolve entity names before searching. Keyword search is a fallback.

### Step 2: Scan — retrieve titles only
`search_articles({conceptUri: "<uri>", articlesCount: 100, articleBodyLen: 0, isDuplicateFilter: "skipDuplicates"})`
Fetch up to 100 articles with NO bodies — returns only titles, dates, sources, and URIs. Very token-efficient. Use `isDuplicateFilter: "skipDuplicates"` to remove wire syndication noise.

### Step 3: Triage — assess relevance
Read the titles from step 2. Select the articles relevant to the user's question by their URIs. If too few relevant results, paginate (`articlesPage: 2`) and repeat step 2.

### Step 4: Retrieve — get full details
`get_article_details({articleUri: ["<uri1>", "<uri2>", "<uri3>", ...]})`
Pass up to 100 URIs per call. If you have more than 100 relevant articles, batch them into multiple calls of 100 URIs each. Add `includeFields` only for data you need.

### Choosing search_articles vs search_events
- **search_articles** → individual articles, full text, specific sources
- **search_events** → high-level overview, deduplicated event clusters, "what's happening with X"

The same pattern applies to events: scan with `search_events` → triage → `get_event_details` with selected URIs.

### When to simplify
- Quick lookups (known URI): go directly to `get_article_details`
- Topic page monitoring: use `get_topic_page_articles`
- Simple questions needing few results: `search_articles` with `articlesCount: 10` (skip triage)

## Citation Format

**CRITICAL: Every factual claim MUST have an inline Markdown link to its source.** This is the single most important formatting rule. A report without clickable source links is incomplete.

- Embed **inline Markdown links** after every factual claim: `[Reuters](URL)`
- The URL comes from the article's `url` field in the tool response — never fabricate URLs
- Reuse the same link when citing the same article multiple times
- If the same source has multiple articles, disambiguate: `[Reuters 1](URL1)` `[Reuters 2](URL2)`
- If a URL is missing, cite by title and source name without a link: *"Title" (Source Name)*
- **No separate Sources section** — all attribution lives inline
- **Self-check before presenting:** scan your output — if any factual sentence lacks a `[Source](URL)` link, add one before responding

## Report Structure

Every research report (except Quick Lookup) must follow this order:

1. **Summary** — 3-5 sentences with inline references covering the key findings
2. **Detailed coverage** — subsections organized by theme, with inline references on every claim
3. **Usage footer** — `**NewsAPI usage:** {N} requests | {T} tokens consumed`

## Content Rules

- **Max one short quote (<15 words) per source article** — paraphrase everything else
- **Synthesize across sources** — do not reconstruct or closely follow any single article's structure
- Missing URL → cite by title and source name (no link)

## Decision Tree

Classify the user's question, then follow the matching pattern:

```
Question
├─ "What's happening with X?" ─────────→ Event Overview
├─ Needs full text / quotes ────────────→ Article Deep Dive
├─ "How does Source A vs B cover X?" ───→ Source Comparison
├─ "What's the sentiment around X?" ────→ Sentiment Analysis
├─ Economic topic (GDP, inflation, ...) → Economic Report
├─ Political topic (policy, elections) ─→ Political Report
├─ Investment/market/company analysis ──→ Investing Report
├─ Multi-angle research question ───────→ Research Report
├─ Due diligence / adverse media / KYC ─→ Adverse Media Report
├─ Company profile / entity intelligence → Company Intelligence Report
├─ Supply chain / operational disruption → Supply Chain Risk Report
├─ Country risk / geopolitical risk ─────→ Geopolitical Risk Report
├─ Topic page URI provided ─────────────→ Topic Page
└─ Quick factual / few results needed ──→ Quick Lookup
```

## Patterns

### 1. Event Overview

Use when the user wants a high-level summary of what's happening with a topic.

1. `suggest({type: "concepts", prefix: "<topic>"})` — resolve URI
2. `search_events({conceptUri: "<uri>", forceMaxDataTimeWindow: 31, eventsCount: 50, eventsSortBy: "date"})` — scan events
3. Triage — select relevant event URIs from titles/summaries
4. `get_event_details({eventUri: ["<uri1>", "<uri2>", ...], includeFields: "concepts,categories"})` — retrieve details
5. Present findings using the **findings template**

### 2. Article Deep Dive

Use when the user needs full article text, quotes, or detailed coverage.

1. `suggest({type: "concepts", prefix: "<topic>"})` — resolve URI
2. `search_articles({conceptUri: "<uri>", articlesCount: 100, articleBodyLen: 0, isDuplicateFilter: "skipDuplicates"})` — scan titles
3. Triage — select relevant article URIs
4. `get_article_details({articleUri: ["<uri1>", "<uri2>", ...], includeFields: "sentiment"})` — retrieve full text
5. Present findings using the **findings template**

### 3. Source Comparison

Use when comparing how different outlets cover the same topic.

1. `suggest({type: "concepts", prefix: "<topic>"})` — resolve topic URI
2. `suggest({type: "sources", prefix: "<source A>"})` — resolve source A URI
3. `suggest({type: "sources", prefix: "<source B>"})` — resolve source B URI
4. `search_articles({conceptUri: "<topic-uri>", sourceUri: "<sourceA-uri>", articlesCount: 50, articleBodyLen: 0, isDuplicateFilter: "skipDuplicates"})` — scan source A
5. `search_articles({conceptUri: "<topic-uri>", sourceUri: "<sourceB-uri>", articlesCount: 50, articleBodyLen: 0, isDuplicateFilter: "skipDuplicates"})` — scan source B
6. Triage — pick representative articles from each source
7. `get_article_details({articleUri: ["<a1>", "<a2>", "<b1>", "<b2>", ...], includeFields: "sentiment"})` — retrieve full text
8. Present findings using the **source comparison template**

### 4. Sentiment Analysis

Use when analyzing tone/sentiment around a topic or entity.

1. `suggest({type: "concepts", prefix: "<entity>"})` — resolve URI
2. `search_articles({conceptUri: "<uri>", articlesCount: 100, articleBodyLen: 0, isDuplicateFilter: "skipDuplicates", includeFields: "sentiment"})` — scan with sentiment
3. Triage — group by positive (>0.3), negative (<-0.3), neutral
4. `get_article_details({articleUri: ["<selected-uris>"], includeFields: "sentiment"})` — retrieve representative articles
5. Present findings using the **sentiment template**

### 5. Topic Page

Use when the user provides a topic page URI or wants monitored topic updates.

1. `get_topic_page_articles({uri: "<topic-page-uri>", articlesCount: 20, articleBodyLen: 200})` — get latest articles
2. Present findings using the **findings template**

### 6. Economic Report

Use when the question is about economic indicators, macro trends, or sector/industry performance.

1. `suggest({type: "concepts", prefix: "<economic topic>"})` — resolve URI (e.g., "inflation", "semiconductor industry")
2. `search_articles({conceptUri: "<uri>", articlesCount: 100, articleBodyLen: 0, isDuplicateFilter: "skipDuplicates", keyword: "GDP, inflation, unemployment, interest rate, recession, growth, forecast, central bank, trade deficit, earnings", keywordOper: "or"})` — scan with economic keywords. Translate keywords to match the language of the task.
3. Triage — select articles covering economic data, policy decisions, sector trends
4. `get_article_details({articleUri: ["<uri1>", "<uri2>", ...], includeFields: "concepts,categories"})` — retrieve full text
5. Present findings using the **economic template**

### 7. Political Report

Use when the question involves policy, legislation, elections, or geopolitics.

1. `suggest({type: "concepts", prefix: "<political topic>"})` — resolve URI
2. `search_events({conceptUri: "<uri>", forceMaxDataTimeWindow: 31, eventsCount: 50, eventsSortBy: "date"})` — scan events for political developments
3. Triage — select relevant events
4. `get_event_details({eventUri: ["<uri1>", "<uri2>", ...], includeFields: "concepts,categories"})` — retrieve details
5. Optionally `search_articles({conceptUri: "<uri>", articlesCount: 100, articleBodyLen: 0, isDuplicateFilter: "skipDuplicates", keyword: "legislation, regulation, policy, vote, amendment, coalition, campaign, reform, mandate, opposition", keywordOper: "or"})` for deeper coverage on key developments. Translate keywords to match the language of the task.
6. Present findings using the **political template**

### 8. Investing Report

Use when the question is about a company, stock, market theme, or investment opportunity.

1. `suggest({type: "concepts", prefix: "<company or asset>"})` — resolve URI
2. `search_articles({conceptUri: "<uri>", articlesCount: 100, articleBodyLen: 0, isDuplicateFilter: "skipDuplicates", keyword: "earnings, revenue, guidance, dividend, valuation, analyst, upgrade, downgrade, IPO, buyback", keywordOper: "or"})` — scan with investing keywords. Translate keywords to match the language of the task.
3. Triage — select articles about earnings, catalysts, risks, market moves
4. `get_article_details({articleUri: ["<uri1>", "<uri2>", ...], includeFields: "sentiment,concepts"})` — retrieve full text with sentiment
5. Present findings using the **investing template**

### 9. Research Report

Use when the question requires multi-angle analysis across different stakeholder perspectives.

1. `suggest({type: "concepts", prefix: "<topic>"})` — resolve URI
2. `search_articles({conceptUri: "<uri>", articlesCount: 100, articleBodyLen: 0, isDuplicateFilter: "skipDuplicates"})` — scan titles. If the topic benefits from keyword narrowing, add `keyword` with relevant terms and `keywordOper: "or"`. Translate keywords to match the language of the task.
3. Triage — select articles representing different viewpoints (industry, regulators, public, etc.)
4. `get_article_details({articleUri: ["<uri1>", "<uri2>", ...], includeFields: "sentiment,concepts,categories"})` — retrieve full text
5. Present findings using the **research template**

### 10. Quick Lookup

Use for simple factual questions needing few results. Skip the triage step.

1. `suggest({type: "concepts", prefix: "<topic>"})` — resolve URI
2. `search_articles({conceptUri: "<uri>", articlesCount: 10, forceMaxDataTimeWindow: 7})` — get recent articles directly
3. Answer the question concisely, cite sources

### 11. Adverse Media Report

Use for due diligence, compliance screening, or reputation checks on a person or organization.

1. `suggest({type: "concepts", prefix: "<entity>"})` — resolve primary entity URI
2. Ask the user: "How deep should I search? I can search just the main entity, or also search associated people/subsidiaries. How many additional entities should I check, or should I use my judgment?"
3. `search_articles({conceptUri: "<uri>", articlesCount: 100, articleBodyLen: 0, isDuplicateFilter: "skipDuplicates", keyword: "fraud, lawsuit, sanction, fine, investigation, allegations, indictment, corruption, money laundering, bribery", keywordOper: "or"})` — scan with adverse keyword filter. Translate keywords to match the language of the task.
4. Triage — select articles covering legal, regulatory, or reputational issues
5. `get_article_details({articleUri: ["<uri1>", ...], includeFields: "concepts"})` — retrieve full text
6. If user approved additional searches: `suggest` + `search_articles` for each associated entity (same keyword filter and language)
7. Triage and retrieve additional entity results
8. Present findings using the **adverse media template**

### 12. Company Intelligence Report

Use for broad company/entity profiling — corporate activity, strategy, competitive landscape, key people.

1. `suggest({type: "concepts", prefix: "<company>"})` — resolve primary entity URI
2. Ask the user: "How deep should I search? I can search just the company, or also search key executives/subsidiaries. How many additional entities should I check, or should I use my judgment?"
3. `search_articles({conceptUri: "<uri>", articlesCount: 100, articleBodyLen: 0, isDuplicateFilter: "skipDuplicates", keyword: "acquisition, merger, partnership, restructuring, earnings, revenue, CEO, strategy, expansion, launch", keywordOper: "or"})` — scan with corporate activity keywords. Translate keywords to match the language of the task.
4. Triage — select articles covering corporate developments, strategy, leadership, competitive moves
5. `search_events({conceptUri: "<uri>", eventsCount: 50, eventsSortBy: "date", forceMaxDataTimeWindow: 31})` — scan recent events for major developments
6. Triage — select relevant events
7. `get_article_details({articleUri: ["<uri1>", ...], includeFields: "concepts,categories"})` — retrieve full article text
8. `get_event_details({eventUri: ["<uri1>", ...], includeFields: "concepts,categories"})` — retrieve event details
9. If user approved additional searches: `suggest` + `search_articles` for key people/subsidiaries (same language)
10. Triage and retrieve additional entity results
11. Present findings using the **company intelligence template**

### 13. Supply Chain Risk Report

Use for supply chain disruptions, operational risks, logistics bottlenecks, sourcing concerns.

1. `suggest({type: "concepts", prefix: "<topic/entity/region>"})` — resolve primary URI
2. Ask the user: "How deep should I search? I can search just the main topic, or also search specific suppliers, routes, or commodities involved. How many additional entities should I check, or should I use my judgment?"
3. `search_articles({conceptUri: "<uri>", articlesCount: 100, articleBodyLen: 0, isDuplicateFilter: "skipDuplicates", keyword: "disruption, shortage, delay, shutdown, strike, tariff, embargo, recall, logistics, inventory", keywordOper: "or"})` — scan with supply chain risk keywords. Translate keywords to match the language of the task.
4. Triage — select articles covering disruptions, operational issues, trade risks
5. `search_events({conceptUri: "<uri>", eventsCount: 50, eventsSortBy: "date", forceMaxDataTimeWindow: 31})` — scan recent events for active disruptions
6. Triage — select relevant events
7. `get_article_details({articleUri: ["<uri1>", ...], includeFields: "concepts,categories"})` — retrieve full article text
8. `get_event_details({eventUri: ["<uri1>", ...], includeFields: "concepts,categories"})` — retrieve event details
9. If user approved additional searches: `suggest` + `search_articles` for specific suppliers, commodities, or trade routes (same language)
10. Triage and retrieve additional entity results
11. Present findings using the **supply chain risk template**

### 14. Geopolitical Risk Report

Use for country/region risk assessments — political stability, security, economic environment, humanitarian factors.

1. `suggest({type: "concepts", prefix: "<country/region>"})` — resolve primary concept URI
2. `suggest({type: "locations", prefix: "<country/region>"})` — resolve location URI for geographic filtering
3. Ask the user: "How deep should I search? I can search just the main country/region, or also search key actors, neighboring countries, or specific conflicts involved. How many additional entities should I check, or should I use my judgment?"
4. `search_events({conceptUri: "<uri>", locationUri: "<loc-uri>", eventsCount: 50, eventsSortBy: "date", forceMaxDataTimeWindow: 31})` — scan events for political/security developments
5. Triage — select relevant events
6. `search_articles({conceptUri: "<uri>", locationUri: "<loc-uri>", articlesCount: 100, articleBodyLen: 0, isDuplicateFilter: "skipDuplicates", keyword: "conflict, sanctions, coup, protest, election, crisis, diplomatic, military, refugee, instability", keywordOper: "or"})` — scan with geopolitical risk keywords and location filter. Translate keywords to match the language of the task.
7. Triage — select articles covering stability, security, diplomacy, economic risks
8. `get_event_details({eventUri: ["<uri1>", ...], includeFields: "concepts,categories"})` — retrieve event details
9. `get_article_details({articleUri: ["<uri1>", ...], includeFields: "concepts,categories"})` — retrieve full article text
10. If user approved additional searches: `suggest` + `search_articles` for key actors, neighboring countries, or specific conflicts (same language)
11. Triage and retrieve additional entity results
12. Present findings using the **geopolitical risk template**

## Suggest Fallback Strategy

If `suggest` returns no results:

1. Try a **shorter prefix** (e.g., "Tesla" instead of "Tesla Inc.")
2. Try **English** if you used another language
3. Try a **broader concept** (e.g., "Olympic Games" instead of "2026 Winter Olympics")
4. Fall back to **keyword search** as last resort

For precision with broad concepts, combine: `conceptUri: "Olympic Games"` + `keyword: "2026"`

## Findings Export

Always format the final output using the appropriate template from `skill/templates/`. Use inline citations (see Citation Format above) — no separate Sources table. Every research session MUST end with the usage footer.

### Template Selection

| Pattern | Template |
|---------|----------|
| Event Overview | `findings.md` — summary + detailed coverage with inline citations |
| Article Deep Dive | `findings.md` — summary + detailed coverage with inline citations |
| Sentiment Analysis | `sentiment.md` — sentiment breakdown with inline citations |
| Economic Report | `economic.md` — macro context + sector focus + outlook with inline citations |
| Political Report | `political.md` — policy + dynamics + geopolitical context + stakeholder reactions |
| Investing Report | `investing.md` — developments + risks + opportunities + catalysts & key dates |
| Research Report | `research.md` — executive summary + key takeaways + multi-perspective analysis + limitations |
| Topic Page | `findings.md` — summary + detailed coverage with inline citations |
| Quick Lookup | No template (concise answer with inline citations) |
| Adverse Media Report | `adverse-media.md` — adverse findings + associated entities + gaps |
| Company Intelligence Report | `company-intel.md` — corporate activity + strategy + regulatory + key people |
| Supply Chain Risk Report | `supply-chain.md` — disruptions + trade risks + mitigation + outlook |
| Geopolitical Risk Report | `geopolitical.md` — stability + security + diplomacy + humanitarian + actors |

### Usage Footer (mandatory)

Every response except Quick Lookup must end with:

```
**NewsAPI usage:** {N} requests | {T} tokens consumed
```

Count every tool call as a request. Read the exact "Tokens used" number from each response footer — do not estimate. Suggest calls cost 0 tokens but still count as requests.

## Token Budget Awareness

Approximate token costs per action:

| Action | Tokens |
|--------|--------|
| suggest | 0 (free) |
| search_articles (scan, bodyLen: 0) | 1-2 |
| search_articles (with body) | 5-10 |
| search_events | 1-2 |
| get_article_details (per batch) | 5-15 |
| get_event_details (per batch) | 2-5 |
| get_topic_page_articles | 1-5 |

A typical Event Overview costs ~5-10 tokens. A full Article Deep Dive costs ~10-20 tokens. Plan accordingly if the user has limited quota.
