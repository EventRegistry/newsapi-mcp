---
name: due-diligence
description: Due diligence on a company, organisation or person with NewsAPI tools. Use for adverse media screening, KYC or compliance checks, reputation checks, ESG controversies, company profiles, entity intelligence, competitive landscape or key-people coverage.
user-invocable: true
allowed-tools: mcp__plugin_newsapi_newsapi__suggest, mcp__plugin_newsapi_newsapi__search, mcp__plugin_newsapi_newsapi__get_breaking_events, mcp__plugin_newsapi_newsapi__get_article_details, mcp__plugin_newsapi_newsapi__get_event_details, mcp__plugin_newsapi_newsapi__get_topic_page_articles, mcp__plugin_newsapi_newsapi__get_topic_page_events, mcp__plugin_newsapi_newsapi__get_api_usage
---

# Due diligence

Read `${CLAUDE_PLUGIN_ROOT}/skills/_reporting.md` first: it holds the search workflow, kinds, aggregates, filters, citation rules, report skeleton, usage footer and the **depth question** both patterns start with.

## Usage

- `/newsapi:due-diligence "Acme Corp"` — adverse media screen
- `/newsapi:due-diligence "profile Acme Corp"` — company intelligence

Adverse media when the user wants risks, screening or reputation; company intelligence when they want a profile, strategy or the competitive picture. Unsure → ask.

Cross-field logic (entity in sources from given countries, several event types minus one source) uses the `query` grammar from the shared reference.

Both patterns lean on **mentions**: a sentence tagged with an event type (lawsuit, fine, acquisition, ...) names the entity and links the article, so the screen is one call per group of event types, and only articles the user wants in detail go through `get_article_details`.

## Adverse media (ask depth)

1. `suggest({type: "concepts", prefix: "<entity>"})`; to find associated entities run `search({kind: "articles", conceptUri, resultType: "conceptAggr"})` and ask the depth question with those names
2. Event types (taxonomy in the shared reference): `et/society/legal` (covers fraud, corruption, sanctions, antitrust, tax evasion, settlements), `et/business/regulatory`, `et/business/labor-issues/executive-scandal`, `et/business/bankruptcy`, `et/society/customers/data-privacy`, `et/society/security/cyber-attacks`, `et/environment/pollution`, `et/society/workforce/working-conditions`
3. `search({kind: "mentions", conceptUri, eventTypeUri: "<those types, comma-separated>", count: 50, factLevel: "fact"})`; an ESG screen adds `options: {esgUri: "esg/governance"}` (or `social`, `environment`)
4. Fallback or complement, when mentions are thin or the user wants the full picture: `search({kind: "articles", conceptUri, count: 100, articleBodyLen: 0, isDuplicateFilter: "skipDuplicates", keyword: "fraud OR lawsuit OR sanction OR fine OR investigation OR allegations OR indictment OR corruption OR \"money laundering\" OR bribery"})`, triage, `get_article_details({articleUri: [...], includeFields: "concepts"})`
5. Repeat 1, 3-4 for each approved associated entity
6. Report with the **adverse media** template; state allegation / charge / conviction for each finding (the mention's `factLevel` and wording help)

## Company intelligence (ask depth)

1. `suggest({type: "concepts", prefix: "<company>"})`
2. `search({kind: "articles", conceptUri, resultType: "conceptAggr"})` for executives, subsidiaries and competitors; ask the depth question with those names
3. `search({kind: "mentions", conceptUri, eventTypeUri: "et/business/acquisitions-mergers,et/business/partnerships,et/business/equity-actions,et/business/labor-issues,et/business/products-services,et/business/earnings", count: 50})`; `resultType: "eventTypeAggr"` first if the user wants the shape of the activity
4. `search({kind: "events", conceptUri, count: 50, sortBy: "date"})` and triage for the major developments; `get_event_details({eventUri: [...], includeFields: "concepts,categories"})`
5. For strategy and competitive detail: `search({kind: "articles", conceptUri, count: 100, articleBodyLen: 0, isDuplicateFilter: "skipDuplicates", keyword: "acquisition OR merger OR partnership OR restructuring OR earnings OR revenue OR CEO OR strategy OR expansion OR launch"})`, triage, `get_article_details({articleUri: [...], includeFields: "concepts,categories"})`
6. Repeat 3 and 5 for each approved executive or subsidiary
7. Report with the **company intelligence** template

## Templates

### Adverse media

```
# Adverse Media Report: [Entity]
Date / Scope (time window, jurisdictions, languages) / Subject (legal name, aliases)

## Summary
[Distinguish allegations from convictions]
## Adverse Findings
[Legal, regulatory, sanctions, fines, fraud, corruption, environmental, labour; by theme;
 state allegation / charge / conviction for each]
## Associated Entities
[Skip if none were searched]
## Gaps & Limitations
[Jurisdictions and languages not covered, name collisions, time window]
```

### Company intelligence

```
# Company Intelligence Report: [Company]
Date / Scope / Subject (legal name, ticker, HQ, sector)

## Summary
## Corporate Activity
[M&A, partnerships, restructuring, leadership changes, capital raises]
## Strategic Direction
[Launches, expansion, R&D, competitive positioning]
## Regulatory & Legal
[Skip if nothing found]
## Key People
[Skip if no associated entities were searched]
```
