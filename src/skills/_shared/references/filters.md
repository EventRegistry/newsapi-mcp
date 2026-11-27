# Filters

- Flat filters are ANDed: `conceptUri` (comma list; `conceptOper: "or"` for any-of), `keyword`, `lang`, `sourceUri`, `categoryUri`, `locationUri`. Exclusions: `ignoreConceptUri`, `ignoreKeyword`, `ignoreSourceUri`. Sources from a country: `sourceLocationUri`. `openSourcesOnly: true` drops paywalled sources when the user asks for open ones.
- Text logic goes in ONE boolean `keyword` string: `"Tesla AND (recall OR lawsuit) NOT Musk"` (AND, OR, NOT, NEAR/n, NEXT/n, quotes). `keywordLoc: "title"` restricts it to headlines.
- Rare filters live under `options: {...}`: `minSentiment`/`maxSentiment` (-1 to 1, English only), `endSourceRankPercentile` (30 keeps the top 30% of sources), `authorUri`, `sourceGroupUri` (from `suggest(type: "sourceGroups")`), `dateMentionStart`, extra `ignore*`. Pair `sortBy: "socialScore"` with `options.endSourceRankPercentile`.
- Logic the flat params cannot express goes in the `query` param (`query-syntax.md`).
