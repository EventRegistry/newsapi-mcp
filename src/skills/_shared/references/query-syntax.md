# Complex queries

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
