---
name: risk
description: Risk assessment with NewsAPI tools. Use for supply chain disruptions, logistics bottlenecks, sourcing or operational risk, and for country or regional geopolitical risk (political stability, security, sanctions, humanitarian factors).
user-invocable: true
allowed-tools: mcp__plugin_newsapi_newsapi__suggest, mcp__plugin_newsapi_newsapi__search, mcp__plugin_newsapi_newsapi__get_breaking_events, mcp__plugin_newsapi_newsapi__get_article_details, mcp__plugin_newsapi_newsapi__get_event_details, mcp__plugin_newsapi_newsapi__get_topic_page_articles, mcp__plugin_newsapi_newsapi__get_topic_page_events, mcp__plugin_newsapi_newsapi__get_api_usage
---

# Risk assessment

Read `${CLAUDE_PLUGIN_ROOT}/skills/_reporting.md` first: it holds the search workflow, kinds, aggregates, filters, citation rules, report skeleton, usage footer and the **depth question** both patterns start with.

## Usage

- `/newsapi:risk "Red Sea shipping"` — supply chain
- `/newsapi:risk "Pakistan"` — geopolitical

Supply chain when the subject is a commodity, route, supplier, industry or disruption; geopolitical when it is a country or region. A route, commodity or region often has no single concept: combine them with the `query` grammar from the shared reference (`$or` over concepts and keywords, `$not` for the noise) instead of running one search per name.

Both patterns combine **mentions** (each disruption or incident as a dated sentence with its entities and article link), **events** (the major developments) and **aggregates** (where and how much).

## Supply chain (ask depth)

1. `suggest({type: "concepts", prefix: "<topic/entity/region>"})`
2. `search({kind: "articles", conceptUri, resultType: "conceptAggr"})` for the suppliers, commodities and routes involved; ask the depth question with those names
3. `search({kind: "mentions", conceptUri, eventTypeUri: "et/business/labor-issues/workers-strike,et/business/products-services/supply,et/business/products-services/product-recall,et/business/industrial-accidents,et/society/transportation/transportation-disruption,et/society/legal/economic-sanctions,et/society/security/cyber-attacks,et/environment/natural-disasters", count: 50, factLevel: "fact"})` (taxonomy in the shared reference)
4. `search({kind: "mentions", conceptUri, eventTypeUri, resultType: "locAggr"})` for where the disruptions cluster; `"timeAggr"` if the user asks whether it is getting worse
5. `search({kind: "events", conceptUri, count: 50, sortBy: "date"})`, triage, `get_event_details({eventUri: [...], includeFields: "concepts,categories"})`; for the key events `get_event_details({eventUri: "<uri>", resultType: "articles", articlesCount: 10})` gives citable rows
6. For mitigation and outlook detail: `search({kind: "articles", conceptUri, count: 100, articleBodyLen: 0, isDuplicateFilter: "skipDuplicates", keyword: "disruption OR shortage OR delay OR shutdown OR strike OR tariff OR embargo OR recall OR logistics OR reshoring OR diversification"})`, triage, `get_article_details({articleUri: [...], includeFields: "concepts,categories"})`
7. Repeat 3 and 6 for each approved supplier, commodity or route
8. Report with the **supply chain** template

## Geopolitical (ask depth)

1. `suggest({type: "concepts", prefix: "<country/region>"})` and `suggest({type: "locations", prefix: "<country/region>"})`
2. `search({kind: "events", conceptUri, locationUri, resultType: "conceptAggr"})` for the key actors; ask the depth question with those names (actors, neighbours, conflicts)
3. `search({kind: "events", conceptUri, locationUri, count: 50, sortBy: "date"})`, triage, `get_event_details({eventUri: [...], includeFields: "concepts,categories"})`; for the key events `get_event_details({eventUri: "<uri>", resultType: "articles", articlesCount: 10})` gives citable rows
4. `search({kind: "mentions", locationUri, eventTypeUri: "et/society/civil-unrest,et/society/war-conflict,et/society/military-explosions,et/society/legal/economic-sanctions,et/society/security,et/environment/natural-disasters/famine", count: 50, factLevel: "fact"})`; elections, coups and diplomacy have no event type and come from the events scan
5. `search({kind: "articles", conceptUri, locationUri, resultType: "timeAggr"})` for the coverage trend; `"sentimentAggr"` for tone
6. For analysis detail: `search({kind: "articles", conceptUri, locationUri, count: 100, articleBodyLen: 0, isDuplicateFilter: "skipDuplicates", keyword: "conflict OR sanctions OR coup OR protest OR election OR crisis OR diplomatic OR military OR refugee OR instability", options: {endSourceRankPercentile: 50}})`, triage, `get_article_details({articleUri: [...], includeFields: "concepts,categories"})`
7. Repeat 4 and 6 for each approved actor, neighbour or conflict
8. Report with the **geopolitical** template

## Templates

### Supply chain

```
# Supply Chain Risk Report: [Topic/Entity/Region]
Date / Scope (time window, industries, regions)

## Summary
## Active Disruptions
[Shortages, delays, shutdowns, bottlenecks, labour actions, natural disasters; where they cluster]
## Trade & Regulatory Risks
[Tariffs, export controls, sanctions, environmental rules; skip if none]
## Mitigation & Response
[Reshoring, diversification, stockpiling, policy; skip if none]
## Outlook
[Resolution timelines, upcoming risk events, coverage trend]
```

### Geopolitical

```
# Geopolitical Risk Report: [Region/Country]
Date / Scope

## Summary
## Political Stability
[Governance, elections, protests, institutional crises]
## Security & Conflict
[Military activity, terrorism, border disputes; skip if none]
## Diplomatic & Economic Environment
[Alliances, sanctions, trade disputes, investment restrictions]
## Humanitarian Factors
[Refugees, food/energy insecurity, public health; skip if none]
## Key Actors
[Heads of state, military, opposition, international organisations]
## Trend
[Coverage volume and tone over the window, from the aggregates]
```
