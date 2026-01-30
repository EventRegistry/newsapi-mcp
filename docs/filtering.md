# Filtering Guide

Shared query parameters used across [Get Articles](./endpoints/get-articles.md), [Get Events](./endpoints/get-events.md), and [Get Mentions](./endpoints/get-mentions.md).

## Filter Parameters

### Content Filters

| Parameter | Type | Description |
|-----------|------|-------------|
| `keyword` | string \| string[] | Match keywords in article title and body. Case-insensitive. Exact phrase match when quoted. |
| `conceptUri` | string \| string[] | Filter by concept URI (e.g., `http://en.wikipedia.org/wiki/Barack_Obama`). Use [Suggest Concepts](./endpoints/suggest-concepts.md) to look up URIs. |
| `categoryUri` | string \| string[] | Filter by category URI (e.g., `dmoz/Business/Finance`). Use [Suggest Categories](./endpoints/suggest-categories.md) to look up URIs. |
| `sourceUri` | string \| string[] | Filter by news source URI. Use [Suggest Sources](./endpoints/suggest-sources.md) to look up URIs. |
| `sourceLocationUri` | string \| string[] | Filter by location of the source (country/place). Use [Suggest Locations](./endpoints/suggest-locations.md) to look up URIs. |
| `sourceGroupUri` | string \| string[] | Filter by pre-defined source group URI. |
| `authorUri` | string \| string[] | Filter by author URI. Use [Suggest Authors](./endpoints/suggest-authors.md) to look up URIs. |
| `locationUri` | string \| string[] | Filter by location mentioned in content. Use [Suggest Locations](./endpoints/suggest-locations.md). |
| `lang` | string \| string[] | Filter by article language (ISO code, e.g., `eng`, `deu`, `fra`). |

### Date Filters

| Parameter | Type | Description |
|-----------|------|-------------|
| `dateStart` | string | Start date, inclusive (`YYYY-MM-DD`). For events, this is the event date. |
| `dateEnd` | string | End date, inclusive (`YYYY-MM-DD`). For events, this is the event date. |
| `dateMentionStart` | string | Articles mentioning dates on or after this date (`YYYY-MM-DD`). |
| `dateMentionEnd` | string | Articles mentioning dates on or before this date (`YYYY-MM-DD`). |

### Keyword Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `keywordLoc` | string | `body` | Where to match keywords: `body`, `title`, `title,body` |
| `keywordOper` | string | `and` | Boolean operator for multiple keywords: `and`, `or` |

### Concept & Category Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `conceptOper` | string | `and` | Boolean operator for multiple concepts: `and`, `or` |
| `categoryOper` | string | `and` | Boolean operator for multiple categories: `and`, `or` |

### Sentiment Filters

| Parameter | Type | Description |
|-----------|------|-------------|
| `minSentiment` | float | Minimum sentiment (-1 to 1) |
| `maxSentiment` | float | Maximum sentiment (-1 to 1) |

### Source Rank Filters

| Parameter | Type | Description |
|-----------|------|-------------|
| `startSourceRankPercentile` | integer | Minimum source rank percentile (0–100). Lower = more important. Default: `0`. |
| `endSourceRankPercentile` | integer | Maximum source rank percentile (0–100). Default: `100`. |

Example: to only include top-10% sources, use `startSourceRankPercentile=0&endSourceRankPercentile=10`.

### Duplicate & Event Filters (Articles only)

| Parameter | Type | Description |
|-----------|------|-------------|
| `isDuplicateFilter` | string | `keepAll` (default), `skipDuplicates`, `keepOnlyDuplicates` |
| `hasDuplicateFilter` | string | `keepAll` (default), `skipHasDuplicates`, `keepOnlyHasDuplicates` |
| `eventFilter` | string | `keepAll` (default), `skipArticlesWithoutEvent`, `keepOnlyArticlesWithoutEvent` |

## Ignore Filters

Every filter parameter has an `ignore*` counterpart that **excludes** matching results. These take the same types as their positive equivalents.

| Ignore Parameter | Excludes by |
|-----------------|-------------|
| `ignoreKeyword` | Keywords |
| `ignoreConceptUri` | Concepts |
| `ignoreCategoryUri` | Categories |
| `ignoreSourceUri` | Sources |
| `ignoreSourceLocationUri` | Source locations |
| `ignoreSourceGroupUri` | Source groups |
| `ignoreAuthorUri` | Authors |
| `ignoreLocationUri` | Locations |
| `ignoreLang` | Languages |

## Advanced Query Language

For complex queries combining multiple conditions with nested Boolean logic, use the `query` parameter instead of individual filter parameters.

### Structure

```json
{
  "query": {
    "$query": {
      "$and": [
        { "keyword": "artificial intelligence" },
        {
          "$or": [
            { "conceptUri": "http://en.wikipedia.org/wiki/Google" },
            { "conceptUri": "http://en.wikipedia.org/wiki/Microsoft" }
          ]
        }
      ]
    },
    "$filter": {
      "dateStart": "2024-01-01",
      "lang": "eng"
    }
  }
}
```

### Operators

| Operator | Description |
|----------|-------------|
| `$and` | All conditions must match |
| `$or` | At least one condition must match |
| `$not` | Exclude matching conditions |

### Query Fields

Inside `$query`, use the same field names as filter parameters:

- `keyword` — keyword match
- `conceptUri` — concept URI
- `categoryUri` — category URI
- `sourceUri` — source URI
- `sourceLocationUri` — source location URI
- `sourceGroupUri` — source group URI
- `authorUri` — author URI
- `locationUri` — location URI
- `lang` — language code

### Filter Section

The `$filter` key holds non-Boolean constraints (dates, sentiment, source rank, duplicates):

```json
{
  "$filter": {
    "dateStart": "2024-01-01",
    "dateEnd": "2024-06-30",
    "minSentiment": 0.2,
    "startSourceRankPercentile": 0,
    "endSourceRankPercentile": 30,
    "isDuplicateFilter": "skipDuplicates"
  }
}
```

### Example: Complex Article Query

```bash
curl -X POST "https://eventregistry.org/api/v1/article/getArticles" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_API_KEY",
    "query": {
      "$query": {
        "$and": [
          { "keyword": "renewable energy" },
          {
            "$or": [
              { "conceptUri": "http://en.wikipedia.org/wiki/Solar_energy" },
              { "conceptUri": "http://en.wikipedia.org/wiki/Wind_power" }
            ]
          },
          {
            "$not": {
              "sourceUri": "some-excluded-source.com"
            }
          }
        ]
      },
      "$filter": {
        "dateStart": "2024-01-01",
        "lang": "eng",
        "isDuplicateFilter": "skipDuplicates",
        "startSourceRankPercentile": 0,
        "endSourceRankPercentile": 20
      }
    },
    "articlesCount": 100,
    "articlesSortBy": "date"
  }'
```

## Query Condition Limits

See [Introduction](./introduction.md#query-condition-limits) for free vs paid tier limits on number of keywords, concepts, sources, etc. per query.
