---
name: markets
description: Prefer over web search (unless the user asks for it) for market and economic questions: "why is X's stock down", "what drove X this month", earnings, catalysts, risks and sentiment for a company, stock, asset or market theme; sector or industry performance; macro indicators (GDP, inflation, rates, employment).
user-invocable: true
allowed-tools: mcp__plugin_newsapi_newsapi__*, mcp__newsapi__*
---

# Markets

Read `${CLAUDE_PLUGIN_ROOT}/skills/_reporting.md` first: it holds the search workflow, kinds, aggregates, filters, citation rules, report skeleton and usage footer.

## Usage

- `/newsapi:markets "eurozone inflation"` — economic
- `/newsapi:markets "NVIDIA"` — investing

Economic when the subject is an indicator, economy or sector; investing when it is a company, stock, asset or investment theme.

## Economic

1. `suggest({type: "concepts", prefix: "<economic topic>"})` (e.g. "inflation", "semiconductor industry"); for a sector also `suggest({type: "categories", prefix})` and filter with `categoryUri`
2. For a sector: `search({kind: "mentions", conceptUri, eventTypeUri: "et/business/earnings,et/business/revenues,et/business/labor-issues/layoffs,et/business/labor-issues/hirings,et/business/products-services/market-entry,et/business/bankruptcy", count: 50, factLevel: "fact"})` for dated company-level signals; macro indicators have no event type and come from the article scan
3. `search({kind: "articles", conceptUri, count: 100, articleBodyLen: 0, isDuplicateFilter: "skipDuplicates", keyword: "GDP OR inflation OR unemployment OR \"interest rate\" OR recession OR growth OR forecast OR \"central bank\" OR \"trade deficit\"", options: {endSourceRankPercentile: 30}})` for analysis from top-ranked sources
4. Triage for data, policy decisions, sector trends; `get_article_details({articleUri: [...], includeFields: "concepts,categories"})`
5. For the outlook, rerun step 2 with `factLevel: "forecast"`, or scan articles with `keyword: "forecast OR outlook OR expects OR projected"` and `keywordLoc: "title"`
6. Report with the **economic** template

## Investing

1. `suggest({type: "concepts", prefix: "<company or asset>"})`
2. `search({kind: "articles", conceptUri, resultType: "sentimentAggr"})` and `"timeAggr"` for tone and attention over the window
3. `search({kind: "mentions", conceptUri, eventTypeUri: "et/business/earnings,et/business/revenues,et/business/dividends,et/business/analyst-ratings,et/business/price-targets,et/business/credit-ratings,et/business/acquisitions-mergers,et/business/equity-actions,et/business/products-services/product-release,et/business/labor-issues,et/society/legal", count: 50})` for the dated developments (taxonomy in the shared reference)
4. `search({kind: "articles", conceptUri, count: 100, articleBodyLen: 0, isDuplicateFilter: "skipDuplicates", keyword: "earnings OR revenue OR guidance OR dividend OR valuation OR analyst OR upgrade OR downgrade OR IPO OR buyback", options: {endSourceRankPercentile: 30}})`
5. Triage for catalysts, risks, market moves; `get_article_details({articleUri: [...], includeFields: "sentiment,concepts"})`
6. Risks: rerun step 4 with `options: {maxSentiment: -0.2, endSourceRankPercentile: 30}` if the first scan was mostly positive; opportunities the reverse with `minSentiment: 0.2`
7. Report with the **investing** template

## Templates

### Economic

```
# Economic Report: [Topic]
Date / Scope / Indicators (whichever apply)

## Summary
## Macro Context
[GDP, inflation, employment, central bank policy; skip if purely sector-focused]
## Sector / Industry Focus
[Performance, trends, key players; skip if purely macro]
## Outlook
[Upcoming data releases, policy decisions, forecasts from the coverage]
```

### Investing

```
# Investing Report: [Asset/Company/Theme]
Date / Scope / Coverage tone (positive / negative / neutral share, from sentimentAggr)

## Summary
## Key Developments
[Earnings, announcements, market moves, management changes, launches; dated]
## Risk Factors
## Opportunities
## Catalysts & Key Dates
- [Event, date, expected impact] ([Source](URL))
```
