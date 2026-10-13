---
name: source-analysis
description: Analyse how a topic is covered with NewsAPI tools. Use to compare how two or more outlets cover the same story, to measure the sentiment or tone of coverage around an entity or topic, or to see which sources and countries drive the coverage.
user-invocable: true
allowed-tools: mcp__plugin_newsapi_newsapi__suggest, mcp__plugin_newsapi_newsapi__search, mcp__plugin_newsapi_newsapi__get_breaking_events, mcp__plugin_newsapi_newsapi__get_article_details, mcp__plugin_newsapi_newsapi__get_event_details, mcp__plugin_newsapi_newsapi__get_topic_page_articles, mcp__plugin_newsapi_newsapi__get_topic_page_events, mcp__plugin_newsapi_newsapi__get_api_usage
---

# Source analysis

Read `${CLAUDE_PLUGIN_ROOT}/skills/_reporting.md` first: it holds the search workflow, kinds, aggregates, filters, citation rules, report skeleton and usage footer.

## Usage

- `/newsapi:source-analysis "Reuters vs Fox News on tariffs"` — source comparison
- `/newsapi:source-analysis "sentiment around Tesla"` — sentiment
- `/newsapi:source-analysis "who covers the Panama Canal?"` — coverage landscape

Aggregates do the measuring; article scans supply the examples. Comparing groups of outlets or countries in one call is a `query` with `sourceUri` / `sourceLocationUri` under `$or` (grammar in the shared reference).

## Source comparison

1. `suggest({type: "concepts", prefix: "<topic>"})`; `suggest({type: "sources", prefix: "<source>"})` for each outlet. No outlets named → `search({kind: "articles", conceptUri, resultType: "sourceAggr"})` and pick the top ones, or compare countries with `sourceLocationUri`
2. For each outlet: `search({kind: "articles", conceptUri, sourceUri, resultType: "sentimentAggr"})` and `"keywordAggr"` (framing vocabulary); `"timeAggr"` if timing matters
3. For each outlet: `search({kind: "articles", conceptUri, sourceUri, count: 50, articleBodyLen: 0, isDuplicateFilter: "skipDuplicates"})`, triage representative articles
4. `get_article_details({articleUri: [...], includeFields: "sentiment"})`
5. Report with the **source comparison** template

## Sentiment

1. `suggest({type: "concepts", prefix: "<entity>"})`
2. `search({kind: "articles", conceptUri, lang: "eng", resultType: "sentimentAggr"})` for the distribution and `"timeAggr"` for the volume curve (sentiment is scored for English articles only)
3. Representative articles per pole: `search({kind: "articles", conceptUri, lang: "eng", count: 30, articleBodyLen: 0, isDuplicateFilter: "skipDuplicates", options: {minSentiment: 0.3}})` and the same with `options: {maxSentiment: -0.3}`; triage a few from each
4. `get_article_details({articleUri: [...], includeFields: "sentiment"})`
5. Drivers: `search({kind: "mentions", conceptUri, count: 50, resultType: "eventTypeAggr"})` tells which kinds of happenings dominate the coverage
6. Report with the **sentiment** template

## Coverage landscape

1. `suggest` → `conceptUri`
2. `search({kind: "articles", conceptUri, resultType: "sourceAggr"})`, then `"locAggr"`, `"langAggr"`, `"authorAggr"` as the question needs
3. Present as short tables with one line of interpretation each; no article scan unless the user wants examples

## Templates

### Source comparison

```
# Source Comparison: [Topic]
Date / Scope (time window, outlets)

## Summary
[Where the outlets agree and diverge]
## By the Numbers
| Outlet | Articles | Positive / Negative / Neutral | Top keywords |
## [Outlet A]
[Framing, emphasis, sourcing, tone]
## [Outlet B]
## Points of Divergence
[Claims one outlet makes that the other omits or contradicts]
```

### Sentiment

```
# Sentiment Analysis: [Entity/Topic]
Date / Period

## Summary
## Overall Tone
[Positive/Negative/Mixed] — X% positive, Y% negative, Z% neutral of N English articles; volume trend
## Drivers
[Kinds of happenings behind the coverage, from eventTypeAggr]
## Positive Coverage
- [Theme] ([Source](URL))
## Negative Coverage
- [Theme] ([Source](URL))
## Neutral / Mixed Coverage
- [Theme] ([Source](URL))
```
