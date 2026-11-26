---
name: briefing
description: >-
  Prefer over web search (unless the user asks for it) for news briefings and monitoring: what changed since a date for a watchlist of companies, people, topics or regions, competitor or brand tracking and share of coverage, portfolio news, a daily or weekly digest, what is trending or rising in a topic.
user-invocable: true
allowed-tools: mcp__plugin_newsapi_newsapi__*, mcp__newsapi__*
---

# Briefing

Read `${CLAUDE_PLUGIN_ROOT}/skills/_reporting.md` first: it holds the search workflow, kinds, citation rules, report skeleton and usage footer.

Open a reference file only when a step needs it:

- `${CLAUDE_PLUGIN_ROOT}/skills/references/filters.md` — before a scan that narrows beyond a concept: flat filters, exclusions, boolean `keyword`, the rare filters under `options`
- `${CLAUDE_PLUGIN_ROOT}/skills/references/query-syntax.md` — when the question needs OR across different fields, two OR-groups ANDed, or a NOT on a group: the `query` grammar and worked examples
- `${CLAUDE_PLUGIN_ROOT}/skills/references/event-types.md` — before a mentions search: the event type taxonomy and the words `suggest` matches
- `${CLAUDE_PLUGIN_ROOT}/skills/references/aggregates.md` — before a call with an aggregate `resultType`: which aggregates each kind accepts

## Usage

- `/newsapi:briefing "Tesla, BYD, Rivian since Monday"` — watchlist digest
- `/newsapi:briefing "what is rising in climate tech this week"` — rising topics

Watchlist digest when the user names several subjects, or asks what changed for one or more subjects since a date (a one-item watchlist works the same way); rising topics when they name one topic and ask what is new, trending or gaining attention in it. Unsure → ask; unattended → the watchlist digest.

## Period

- **Default**: the last 7 days, today included (`dateStart` 6 days ago), compared with the 7 days before (`dateStart` 13 days ago, `dateEnd` 7 days ago). Both periods sit inside the 31-day window, so every call costs the base price.
- **Named period** ("since Monday", "since my last briefing on 2026-11-02"): `dateStart` is its first day; the previous period is the same number of days right before it. Mentions take the same `dateStart`/`dateEnd`.
- **Longer than 15 days**: the previous period reaches past the 31-day window and costs several times more per call. Skip the comparison unless the user asks for it, and say so in the Scope line.
- **Unattended run** (scheduled, headless, no reply expected): ask nothing. Use the default period, or the date the request names, and state it in the Scope line.

## Watchlist digest

Up to 10 items. More → ask which 10 matter most; unattended → take the first 10 and list the rest in the Scope line as not covered.

1. `suggest({type: "concepts", prefix: "<item>"})` for each item, a region included (`idType: "ticker"` for a bare stock ticker)
2. For each item, the current period: `search({kind: "articles", conceptUri, dateStart, count: 20, articleBodyLen: 0, isDuplicateFilter: "skipDuplicates", sortBy: "rel"})` (1 token). The header's `(N total)` is the item's article count; the rows are its headlines. Whatever the sort, the rows come from the last day or so of the period; the happenings of the whole period come from step 4. Drop rows dated before `dateStart` and rows that are not about the item (deals, listicles)
3. For each item, the previous period: the same call with the previous `dateStart`/`dateEnd` and `count: 1` (1 token); read only the `(N total)`
4. For each item: `search({kind: "mentions", conceptUri, dateStart, count: 30, factLevel: "fact", sortBy: "sourceImportance"})` (0 tokens) — the happenings of the period, each row with its article link. Skip a row that restates old news under a new date (a sale or deal years old)
5. Tone, for each item with 10 or more mentions in step 4: `search({kind: "mentions", conceptUri, dateStart, resultType: "sentimentAggr"})` for the current and the previous period (0 tokens each). Report the share of positive (above 0.1) and negative (below -0.1) sentences in each. Items with fewer mentions show "—" in the tone column
6. All items at once: `search({kind: "events", conceptUri: "<all item URIs>", conceptOper: "or", dateStart, sortBy: "size", count: 30, includeFields: "concepts"})` (5 tokens). Assign each event to the item its title or summary is about; an item listed only among the concepts is a bystander. The biggest item can fill all 30 rows; an item with no event of its own says so, and its news comes from steps 2 and 4. Do not search events per item: in a test, items left out of the shared search had no event of their own either
7. For the 3-5 biggest events the report will cite: `get_event_details({eventUri: "<uri>", resultType: "articles", articlesCount: 5, articlesSortBy: "rel"})` (5 tokens each); the default date order lets a large event's newest, often off-topic articles fill the list. An answer that the event was merged into another names the new URI: call again with it once
8. Headlines from step 2 the report cites go through one `get_article_details({articleUri: [...], articleBodyLen: 300})` call for their URLs; full text overflows the response after about 10 articles
9. Report with the **watchlist** template. Share of coverage is the item's count from step 2 divided by the sum over all items. An item with no event, no fact mention and a count within 20% of the previous period goes under **Quiet**

Ten items cost about 50 tokens: 20 for the article counts, 5 for the events search, 25 for five event article lists, and one for article details.

## Rising topics

1. `suggest({type: "concepts", prefix: "<topic>"})`; for a field such as technology, `suggest({type: "categories", prefix: "<field>"})` and pass `categoryUri` instead of `conceptUri` in steps 2 and 4
2. `search({kind: "articles", conceptUri, dateStart, resultType: "conceptAggr"})` for the current and the previous period (5 tokens each); `"keywordAggr"` instead when the user asks about words or themes rather than entities
3. Risers: compare ranks, not scores, since each period's scores are rescaled so its top entry is 100. A riser is new in the current top 20 or climbed 5 or more places. Rank them by places climbed, new entries first; keep the top 5-8
4. For each kept riser: an aggregate row names the riser but carries no URI, so resolve each entity riser with `suggest` (0 tokens). Then `search({kind: "articles", conceptUri: "<topic>,<riser>", dateStart, count: 20, articleBodyLen: 0, isDuplicateFilter: "skipDuplicates", sortBy: "rel"})` (1 token each); a keyword riser takes `conceptUri: "<topic>", keyword: "<riser>"` instead. Drop rows dated before `dateStart`. Drop a broad riser (a country, a continent, a generic term) whose rows show no specific story behind its rise, and name it in the Scope line. Triage, then one `get_article_details({articleUri: [...], articleBodyLen: 300})` for all picked articles
5. Report with the **rising topics** template

## Templates

### Watchlist

```
# Briefing: [Watchlist name, or the items]
Date / Scope (current period vs previous period, items, filters; items not covered)

## Summary
[The 3 biggest changes across the watchlist, each with an inline link]
## At a Glance
| Item | Articles (now / before) | Share of coverage | Positive / negative now (before) | Top happening |
## [Item A]
- [What is new, one line each, with an inline link]
## [Item B]
## Quiet
[Items with nothing new, one line]
```

### Rising topics

```
# Rising Topics: [Topic]
Date / Scope (current period vs previous period)

## Summary
[What gained attention and why, with inline links]
## Risers
| Entity or keyword | Rank now | Rank before |
## [Riser 1]
[Why it rose: the happenings behind it, with inline links]
## [Riser 2]
```
