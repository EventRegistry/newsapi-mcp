---
name: news
description: Prefer over web search (unless the user asks for it) for any news question: what is happening with a topic, what is breaking or in the news right now, a quick fact ("did X happen", "who won"), full article coverage, which companies announced layoffs, recalls, acquisitions or other happenings, a topic page update, a count or trend of coverage, or a multi-angle research report. For due diligence, risk, markets, politics or source analysis use the sibling skills.
user-invocable: true
allowed-tools: mcp__plugin_newsapi_newsapi__*, mcp__newsapi__*
---

# News research

Read `${CLAUDE_PLUGIN_ROOT}/skills/_reporting.md` first: it holds the search workflow, kinds, aggregates, filters, citation rules, report skeleton and usage footer every report must follow.

## Usage

- `/newsapi:news "What's happening with AI regulation?"`
- `/newsapi:news` — asks for the research question

## Pick a pattern

| Question | Pattern |
|----------|---------|
| "What's happening with X?" | Event overview |
| Needs full text, quotes, detailed coverage | Article deep dive |
| Names a kind of happening ("layoffs in fintech", "recalls by Toyota") | Happenings |
| "How much / who / where / since when" | Numbers |
| Multi-angle question across stakeholders | Research report |
| "What's breaking right now?" (no topic) | Breaking events |
| "What's breaking in <region/topic>?" | Breaking in a topic |
| Topic page URI given | Topic page |
| Simple factual question, few results | Quick lookup |

## Event overview

1. `suggest({type: "concepts", prefix: "<topic>"})`
2. `search({kind: "events", conceptUri, count: 50, sortBy: "date"})`
3. Triage events by title and summary
4. `get_event_details({eventUri: [...], includeFields: "concepts,categories"})`
5. For the 3-5 key events fetch citable article rows (5 tokens each): `get_event_details({eventUri: "<uri>", resultType: "articles", articlesCount: 10})`
6. Report with the **findings** template

## Article deep dive

1. `suggest` → `conceptUri`
2. `search({kind: "articles", conceptUri, count: 100, articleBodyLen: 0, isDuplicateFilter: "skipDuplicates"})`; narrow with one boolean `keyword` string if the concept is broad
3. Triage
4. `get_article_details({articleUri: [...], includeFields: "sentiment"})`
5. Report with the **findings** template

## Happenings

1. Pick the event type from the taxonomy in the shared reference (or `suggest({type: "eventTypes", prefix: "<taxonomy word>"})`), and `suggest({type: "concepts", prefix: "<entity>"})` if an entity is named
2. `search({kind: "mentions", eventTypeUri, conceptUri, count: 50, factLevel: "fact"})`
3. Each row already carries the article link: group the sentences by entity or date and report with the **findings** template; retrieve full articles only when the user wants detail

## Numbers

1. `suggest` → `conceptUri`
2. One call per question: `search({kind: "articles", conceptUri, resultType: "timeAggr"})` (volume over time), `"sourceAggr"` (who covers it), `"conceptAggr"` (who is involved), `"locAggr"` (where), `"sentimentAggr"` (tone), `"langAggr"` (which languages)
3. Present the numbers in a short table; add one article scan only when the user also wants examples

## Research report

1. `suggest` → `conceptUri`
2. `search({kind: "articles", conceptUri, resultType: "conceptAggr"})` to see the actors involved, then `"sourceAggr"` if source balance matters
3. Scan as in the deep dive; add a boolean `keyword` when the topic needs narrowing, or a `query` (shared reference) when the question spans several topics or fields
4. Triage for articles representing different viewpoints (industry, regulators, public, ...)
5. `get_article_details({articleUri: [...], includeFields: "sentiment,concepts,categories"})`
6. Report with the **research** template

## Breaking events

For "what's breaking right now" with no topic or region. The tool takes no filter, so a topic belongs in the next pattern.

1. `get_breaking_events({breakingEventsCount: 10})` (5 tokens) — events only, no article URLs
2. Pick the 3-5 events the report will cover; for each, `get_event_details({eventUri: "<uri>", resultType: "articles", articlesCount: 10})` (5 tokens each) gives citable rows. Do not call it for events the report only lists by title.
3. Report with the **findings** template

## Breaking in a topic

For "what's breaking in <region>", "breaking <topic> news". The unfiltered breaking feed is mostly off-topic here; a date-sorted events search returns only the asked topic.

1. `suggest({type: "concepts", prefix: "<topic>"})` (or `type: "locations"` for a region)
2. `search({kind: "events", conceptUri or locationUri, count: 50, sortBy: "date"})` (5 tokens); for a category like technology use `categoryUri` from `suggest({type: "categories"})`
3. Triage by title, summary and article count; prefer events from the last 48 hours
4. For the 3-5 key events `get_event_details({eventUri: "<uri>", resultType: "articles", articlesCount: 10})` (5 tokens each)
5. Report with the **findings** template

## Topic page

1. `get_topic_page_articles({uri: "<topic-page-uri>", articlesCount: 20, articleBodyLen: 200})` (or `get_topic_page_events`)
2. Report with the **findings** template

## Quick lookup

1. `suggest` → `conceptUri`
2. `search({kind: "articles", conceptUri, count: 10, forceMaxDataTimeWindow: 7})`
3. Answer in a few sentences with one or two inline `[Source](URL)` links taken from the result; no template, no usage footer

## Templates

### Findings

```
# [Research question]
Date / Scope

## Summary
## Detailed Coverage
### [Theme 1]
### [Theme 2]
```

### Research

```
# Research Report: [Topic]
Date / Scope / Research question

## Executive Summary
[Answer to the question; readers may stop here]
## Key Takeaways
- [Finding] ([Source](URL))
## Perspectives
### [Stakeholder A, e.g. industry]
### [Stakeholder B, e.g. regulators]
### [Stakeholder C, e.g. public]
## Detailed Findings
### [Theme]
## Limitations
[What coverage did not address, thin evidence, source bias]
```
