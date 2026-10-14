# NewsAPI research: shared rules

Read by every skill in this plugin before its own workflow. Not a skill itself.

## Rules

0. **Use whichever NewsAPI.ai server is connected** — the tools below (`suggest`, `search`, `get_article_details`, ...) come from whichever NewsAPI.ai MCP server the client has: the plugin's hosted server (`mcp__plugin_newsapi_newsapi__*`), the NewsAPI.ai connector, or a local `newsapi` server (`mcp__newsapi__*`); all expose the same tools. Call the one that is connected and logged in; if the hosted server only offers `authenticate` and a local server is present, use the local one. Never answer from web search or memory because the expected server name is missing.
1. **Sequential requests only** — never fire NewsAPI calls in parallel.
2. **Deduplicate by default** — `isDuplicateFilter: "skipDuplicates"` in every article scan.
3. **Track usage** — read the "Tokens used" footer from every response and report totals at the end.
4. **Translate keywords** — every `keyword` string below is English; translate it to the language of the task and keep the boolean operators.
5. **Keep the default window** — a search with no date filter covers the last 31 days at 1 API token (events: 5); "this week" is `forceMaxDataTimeWindow: 7` for articles and events, `dateStart: <7 days ago>` for mentions (which take no `forceMaxDataTimeWindow`). Dates inside the last 31 days cost the same as the default; only a `dateStart` older than 31 days costs 5-10× more, so set one only when the user names such a period.

## Workflow: suggest → scan → triage → retrieve

1. **Suggest** — `suggest({type: "concepts", prefix: "<topic>"})` → `conceptUri`. Always resolve entity names before searching; keyword search is a fallback.
2. **Scan** — `search({kind: "articles", conceptUri: "<uri>", count: 100, articleBodyLen: 0, isDuplicateFilter: "skipDuplicates"})`. One row per article: titles, dates, sources, URIs, no bodies.
3. **Triage** — pick the relevant URIs from the titles. A scan with 20 or more rows is enough; fewer → tighten or widen the filter once (`keywordLoc: "title"`, a boolean keyword, `sortBy: "rel"`), fetch at most one more page (`page: 2`).
4. **Retrieve** — `get_article_details({articleUri: [...]})`, up to 100 URIs per call; batch beyond that. Add `includeFields` only for data you need.

Events follow the same pattern: `search({kind: "events", conceptUri, count: 50, sortBy: "date"})` → triage → `get_event_details({eventUri: [...]})`. The details call costs 20 tokens however many URIs it carries, so put every triaged URI into one call, never one call per event.

### Kinds

- **kind: "articles"** → individual articles, full text, specific sources.
- **kind: "events"** → deduplicated clusters, "what's happening with X". Costs 5 API tokens per call (articles: 1): use it with `conceptUri`, never repeat it with reworded keywords.
- **kind: "mentions"** → sentences that state a kind of happening (acquisition, layoffs, lawsuit, recall, sanction, launch, strike, ...). Pick the type from the taxonomy below (or `suggest({type: "eventTypes", prefix: "layoffs"})`), then `search({kind: "mentions", eventTypeUri, conceptUri, count: 50})`. Each row is one sentence with its entities, sentiment, fact level and the article link, so cited mentions need no `get_article_details`. Several types comma-separated are ORed, and a parent type covers all its subtypes (`et/society/legal` matches fraud, sanctions, corruption, settlements, ...); `factLevel: "fact"` drops opinion and forecast sentences; `options.industryUri`, `options.esgUri` (`esg/environment`, `esg/social`, `esg/governance`), `options.sasbUri`, `options.sdgUri` filter by framework.

### Event type taxonomy

`suggest({type: "eventTypes"})` matches a word in the path, so use the taxonomy's own words ("legal", "layoffs", "acquisition"), not synonyms ("lawsuit", "fine"). Parents cover children; the ones the skills use:

| Branch | Subtypes |
|--------|----------|
| `et/business/acquisitions-mergers` | `acquisition`, `merger` (+ `/rumor`, `/completed`, `/blocked`, `/failed`) |
| `et/business/labor-issues` | `layoffs`, `hirings`, `workers-strike`, `executive-appointment`, `executive-resignation`, `executive-firing`, `executive-scandal`, `board-member-appointment` |
| `et/business/products-services` | `product-release`, `product-recall`, `product-discontinued`, `business-contract`, `government-contract`, `market-entry`, `market-share`, `supply`, `subsidy`, `grant` |
| `et/business/equity-actions` | `initial-public-offering`, `investment`, `fundraising`, `spin-off`, `ownership`, `taxes` |
| `et/business/...` | `earnings`, `revenues`, `dividends`, `stock-prices`, `price-targets`, `analyst-ratings`, `credit-ratings`, `credit`, `bankruptcy`, `partnerships`, `regulatory/regulatory-investigation`, `industrial-accidents/{facility-accident, force-majeure, ai-incident}` |
| `et/society/legal` | `fraud`, `corruption`, `sanctions`, `economic-sanctions`, `antitrust-investigation`, `tax-evasion`, `settlement`, `copyright-infringement`, `patent-infringement`, `legal-issues` |
| `et/society/...` | `civil-unrest/{riot, state-of-emergency}`, `war-conflict/airstrike`, `military-explosions/artilery-missile-attack`, `security/cyber-attacks`, `crime/{shooting, stabbing-hacking, arsony}`, `safety/{fire, vehicle-accident}`, `transportation/transportation-disruption`, `customers/data-privacy`, `workforce/working-conditions`, `corporate-responsibility/{donation, sponsorship}` |
| `et/environment` | `natural-disasters/{earthquake, heavy-rains, heat-wave, cold-wave, landslide, famine, volcanic-eruption}`, `pollution/{oil-spill, chemical-waste, water-shortage, deforestation}`, `emissions/...` |

There is no politics branch: elections, votes and legislation are events and articles, not mentions.

### Aggregates — numbers instead of lists

A quantitative question (volume over time, who covers it, which entities, what tone) is one call with `resultType` set to an aggregate: `timeAggr`, `sourceAggr`, `conceptAggr`, `categoryAggr`, `keywordAggr`, `sentimentAggr`, `locAggr`, `authorAggr`, `langAggr` (articles, mentions), `eventTypeAggr` (mentions). It summarises every match; no scan, no triage. Report aggregate numbers in a short table.

### Filters

- Flat filters are ANDed: `conceptUri` (comma list; `conceptOper: "or"` for any-of), `keyword`, `lang`, `sourceUri`, `categoryUri`, `locationUri`. Exclusions: `ignoreConceptUri`, `ignoreKeyword`, `ignoreSourceUri`. Sources from a country: `sourceLocationUri`.
- Text logic goes in ONE boolean `keyword` string: `"Tesla AND (recall OR lawsuit) NOT Musk"` (AND, OR, NOT, NEAR/n, NEXT/n, quotes). `keywordLoc: "title"` restricts it to headlines.
- Rare filters live under `options: {...}`: `minSentiment`/`maxSentiment` (-1 to 1, English only), `endSourceRankPercentile` (30 keeps the top 30% of sources), `authorUri`, `sourceGroupUri`, `dateMentionStart`, extra `ignore*`. Pair `sortBy: "socialScore"` with `options.endSourceRankPercentile`.
- Logic the flat params cannot express goes in the `query` param (below).

### Complex queries

Flat filters AND everything. When the question needs OR across different fields, two OR-groups ANDed, or a NOT on a group, pass a `query` object; flat filters given alongside are merged into it.

```
{"$query": NODE, "$filter": {...}}
NODE  = {"$and": [NODE, ...]} | {"$or": [NODE, ...]} | LEAF
LEAF  = {conceptUri | keyword | keywordLoc | categoryUri | sourceUri | sourceLocationUri |
         locationUri | authorUri | lang | dateStart | dateEnd | eventTypeUri: value}
value = "uri" | {"$or": ["uri1", "uri2"]}        keys in one leaf are ANDed
"$not": NODE sits beside "$and" / "$or", never alone
"$filter": isDuplicate, minSentiment, maxSentiment, startSourceRankPercentile, endSourceRankPercentile
```

Worked examples (URIs come from `suggest`):

- Either of two topics, from any of two companies, not a third:
  `{"$query": {"$and": [{"$or": [{"conceptUri": "<AI Act>"}, {"keyword": "Digital Services Act"}]}, {"conceptUri": {"$or": ["<Meta>", "<Google>"]}}], "$not": {"conceptUri": "<TikTok>"}}}`
- Entity in sources from two countries, English or German, negative only:
  `{"$query": {"$and": [{"conceptUri": "<Entity>"}, {"sourceLocationUri": {"$or": ["<USA>", "<Germany>"]}}, {"lang": {"$or": ["eng", "deu"]}}]}, "$filter": {"maxSentiment": -0.2}}`
- Two time windows compared (run twice): `{"$query": {"$and": [{"conceptUri": "<X>"}, {"dateStart": "2026-09-01", "dateEnd": "2026-09-30"}]}}`
- Mentions of any of several event types about an entity, excluding one source: `{"$query": {"$and": [{"conceptUri": "<X>"}, {"eventTypeUri": {"$or": ["<lawsuit>", "<fine>"]}}], "$not": {"sourceUri": "<source>"}}}` (comma lists do the same OR within one field; use `query` once a NOT or a second field joins in)

Rules: resolve every URI first; keep text logic inside one boolean `keyword` string rather than nesting keyword leaves; a query-shaped 400 returns rewrite guidance, follow it once. Depth-question extras (associated entities) are separate searches, not one giant `$or`, so each entity's findings stay attributable.

### Article URLs from events

`get_event_details({eventUri: "<uri>", resultType: "articles", articlesCount: 10})` returns one row per article (`# | uri | date | source | title | url`), no bodies, 5 tokens. Single `eventUri` only, not an array. Use it to cite events without a second `search`; add `articlesArticleBodyLen: 300` only when the text itself is needed. `get_breaking_events` returns events without article URLs; fetch rows for the events you cite rather than passing `includeTopArticleUrl: true`, which costs 5 tokens for every listed event whether cited or not.

### Suggest fallback

If `suggest` returns nothing: shorter prefix ("Tesla", not "Tesla Inc.") → English → broader concept ("Olympic Games", not "2026 Winter Olympics") → keyword search. For precision with a broad concept combine `conceptUri` + `keyword` ("Olympic Games" + "2026").

### Depth question

Skills marked **ask depth** start by asking the user: "How deep should I search? Just the main entity, or also associated entities (people, subsidiaries, suppliers, neighbouring countries)? How many, or should I use my judgment?" Skip the question when the user has already named the depth, or cannot answer (automation, headless run, no reply expected): assume the main entity only, state that in the report's Scope line and continue. Each approved extra entity is its own suggest → scan → triage → retrieve with the same keyword filter and language.

## Citations

**Every factual claim carries an inline Markdown link to its source.** A report without clickable links is incomplete.

- Form: `claim ([Reuters](URL))`. The URL is the `url` field of an article row or `URL:` line in a tool result of this conversation. Copy it character by character, including the slug; a URL retyped from the headline or from memory is a different URL and points nowhere.
- Only retrieved articles get a link. A claim read in an event summary, a mention or another article's body has no URL of its own: cite it as plain text, *"Title" (Source, via event summary)* or *(per Reuters, in [Outlet](URL))*. Never build a URL from an outlet name and a headline, even when the outlet is well known.
- Link the article whose text states the claim, not another article from the same outlet or event.
- Never link an outlet's homepage, section or date index page (`example.com/news/business/2026/1008/`). Missing URL → cite by title and source name without a link: *"Title" (Source)*.
- Reuse the same link for repeated citations; disambiguate several articles from one outlet as `[Reuters 1](URL1)`, `[Reuters 2](URL2)`.
- Do not sharpen a source: a forecast, allegation or estimate stays one in the report.
- No separate Sources section; all attribution is inline.
- Self-check before presenting, both directions: any factual sentence without a `[Source](URL)` link gets one, and every link is located in a tool result row; a link you cannot find is removed and the claim cited as plain text. Do this check in the final pass of writing the report, not in a separate tool call.

## Content

- Max one short quote (under 15 words) per source article; paraphrase the rest.
- Synthesize across sources; never follow one article's structure.
- Distinguish allegations from charges from convictions wherever legal matters appear.

## Report skeleton

Every report except a quick lookup follows this order. Each skill's template fills in the middle sections.

```
# <Report type>: [Subject]

**Date:** YYYY-MM-DD
**Scope:** [time window, region/sources, filters used]

## Summary
[3-5 sentences with inline links covering the key findings]

## <Template sections>
[Every claim with an inline citation; skip a section the coverage does not support and say so]

---

**NewsAPI usage:** {N} requests | {T} tokens consumed
```

### Usage footer (mandatory)

Count every NewsAPI tool call as a request, including `suggest` (0 tokens); `Read`, `Skill` and other non-NewsAPI tools are not requests. Read the exact "Tokens used" number from each response footer; do not estimate. `get_api_usage` returns the account's total, not a call cost: count it as a request with 0 tokens and never add its number to the sum.

## Token budget

Measured on the live API (2026-10-09); the response footer is authoritative.

| Action | Tokens |
|--------|--------|
| suggest | 0 |
| search articles, scan (`articleBodyLen: 0`) | 1 |
| search articles, with body | 1 |
| search articles, aggregate resultType | 5 |
| search events (list or aggregate) | 5 |
| search mentions (list or aggregate) | 0 |
| get_breaking_events | 5; +5 per event with `includeTopArticleUrl` |
| get_article_details, per batch | 1-5 |
| get_event_details info, per call (any number of URIs) | 20 |
| get_event_details articles, per event | 5 |
| get_topic_page_articles | 1-5 |
| get_api_usage | 0 (account total, not a cost) |

An event overview costs about 40 tokens (events 5 + info 20 + 3 article lookups), an article deep dive 2-5, a mentions report 0-5. Plan accordingly when the user's quota is limited.
