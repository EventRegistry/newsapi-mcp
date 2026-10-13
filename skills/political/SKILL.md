---
name: political
description: Political research with NewsAPI tools. Use for policy, legislation, regulation, elections, campaigns, coalitions and diplomatic developments. For country risk assessments use the risk skill.
user-invocable: true
allowed-tools: mcp__plugin_newsapi_newsapi__suggest, mcp__plugin_newsapi_newsapi__search, mcp__plugin_newsapi_newsapi__get_breaking_events, mcp__plugin_newsapi_newsapi__get_article_details, mcp__plugin_newsapi_newsapi__get_event_details, mcp__plugin_newsapi_newsapi__get_topic_page_articles, mcp__plugin_newsapi_newsapi__get_topic_page_events, mcp__plugin_newsapi_newsapi__get_api_usage
---

# Political

Read `${CLAUDE_PLUGIN_ROOT}/skills/_reporting.md` first: it holds the search workflow, kinds, aggregates, filters, citation rules, report skeleton and usage footer.

## Usage

- `/newsapi:political "EU AI Act"`

Events first (what happened), articles for stakeholder detail; mentions only for the happenings the taxonomy covers (sanctions, unrest, conflict, regulatory investigations), since elections, votes and legislation have no event type.

## Workflow

1. `suggest({type: "concepts", prefix: "<political topic>"})`; for a jurisdiction also `suggest({type: "locations", prefix})`
2. `search({kind: "events", conceptUri, count: 50, sortBy: "date"})`, triage, `get_event_details({eventUri: [...], includeFields: "concepts,categories"})`
3. For the 3-5 key events fetch citable article rows (5 tokens each): `get_event_details({eventUri: "<uri>", resultType: "articles", articlesCount: 10})`
4. When the topic involves them: `search({kind: "mentions", conceptUri, eventTypeUri: "et/society/legal/economic-sanctions,et/society/civil-unrest,et/society/war-conflict,et/business/regulatory", count: 50, factLevel: "fact"})` for dated incidents
5. `search({kind: "articles", conceptUri, resultType: "conceptAggr"})` to see which parties, agencies and groups dominate the coverage; `"sourceAggr"` if the user asks about media attention
6. For stakeholder reactions: `search({kind: "articles", conceptUri, count: 100, articleBodyLen: 0, isDuplicateFilter: "skipDuplicates", keyword: "legislation OR regulation OR policy OR vote OR amendment OR coalition OR campaign OR reform OR opposition"})`, triage, `get_article_details({articleUri: [...], includeFields: "sentiment,concepts"})`
7. Report with the template below

## Template

```
# Political Report: [Topic]
Date / Scope (time window, jurisdiction)

## Summary
## Policy & Legislation
[Government actions, regulatory moves, legislative progress; dated from the events]
## Political Dynamics
[Elections, campaigns, party positioning, coalitions; skip if none]
## Geopolitical Context
[International relations, diplomacy, trade disputes; skip if none]
## Stakeholder Reactions
[Industry, civil society, opposition, allies; ordered by prominence in conceptAggr]
```
