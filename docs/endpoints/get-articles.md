# Get Articles

Find news articles matching one or more search conditions.

## Endpoint

```
GET | POST https://eventregistry.org/api/v1/article/getArticles
```

## Description

Search for articles using keywords, concepts, sources, categories, dates, languages, and more. Supports simple parameter-based queries and complex nested queries via the `query` parameter using the [Advanced Query Language](https://github.com/EventRegistry/event-registry-python/wiki/Searching-for-articles#advanced-query-language).

- Returns up to **100 articles per call** (1 token per call).
- Paginate with `articlesPage` (2, 3, 4, ...) for additional results.
- Use `ignore*` parameters to exclude unwanted results.
- Supports multiple `resultType` values for aggregated summaries instead of article lists.

## Parameters

### Required

| Parameter | Type | Description |
|-----------|------|-------------|
| `apiKey` | string | Your API key |

### Result Control

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `resultType` | string | `articles` | Result format. Values: `articles`, `uriWgtList`, `langAggr`, `timeAggr`, `sourceAggr`, `sourceExAggr`, `authorAggr`, `keywordAggr`, `locAggr`, `conceptAggr`, `conceptGraph`, `categoryAggr`, `dateMentionAggr`, `sentimentAggr`, `recentActivityArticles` |
| `articlesPage` | integer | `1` | Page number (starting from 1) |
| `articlesCount` | integer | `100` | Articles per page (max 100) |
| `articlesSortBy` | string | `date` | Sort by: `date`, `rel`, `sourceImportance`, `sourceAlexaGlobalRank`, `sourceAlexaCountryRank`, `socialScore`, `facebookShares` |
| `articlesSortByAsc` | boolean | `false` | Ascending sort order |
| `articleBodyLen` | integer | `-1` | Body length in response. `-1` for full body. |
| `dataType` | string \| string[] | `news` | Content types: `news`, `pr`, `blog` |
| `forceMaxDataTimeWindow` | integer | — | Limit to recent data: `7` or `31` days only |

### Filters

See [Filtering Guide](../filtering.md) for the full list of shared filter parameters including:
- `keyword`, `conceptUri`, `categoryUri`, `sourceUri`, `sourceLocationUri`, `sourceGroupUri`, `authorUri`, `locationUri`
- `lang`, `dateStart`, `dateEnd`, `dateMentionStart`, `dateMentionEnd`
- `keywordLoc`, `keywordOper`, `conceptOper`, `categoryOper`
- `minSentiment`, `maxSentiment`
- `isDuplicateFilter`, `eventFilter`
- `startSourceRankPercentile`, `endSourceRankPercentile`
- All corresponding `ignore*` variants
- `query` (Advanced Query Language object)

### Returned Details

See [Response Details](../response-details.md) for `include*` parameters controlling article, source, concept, category, and location metadata.

## Examples

### Basic keyword search

```bash
curl -X POST "https://eventregistry.org/api/v1/article/getArticles" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_API_KEY",
    "keyword": "Tesla Inc",
    "articlesCount": 100,
    "articleBodyLen": -1,
    "sourceLocationUri": [
      "http://en.wikipedia.org/wiki/United_States",
      "http://en.wikipedia.org/wiki/Canada",
      "http://en.wikipedia.org/wiki/United_Kingdom"
    ],
    "forceMaxDataTimeWindow": 31
  }'
```

### Using the Advanced Query Language

```bash
curl -X POST "https://eventregistry.org/api/v1/article/getArticles" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_API_KEY",
    "query": {
      "$query": {
        "$and": [
          { "keyword": "artificial intelligence" },
          { "conceptUri": "http://en.wikipedia.org/wiki/Google" }
        ]
      }
    },
    "articlesCount": 50,
    "articlesSortBy": "rel"
  }'
```

### Get time aggregation

```bash
curl -X POST "https://eventregistry.org/api/v1/article/getArticles" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_API_KEY",
    "keyword": "climate change",
    "resultType": "timeAggr"
  }'
```
