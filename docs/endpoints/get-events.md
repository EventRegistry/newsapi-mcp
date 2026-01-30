# Get Events

Find events matching one or more search conditions.

## Endpoint

```
GET | POST https://eventregistry.org/api/v1/event/getEvents
```

## Description

Search for events using keywords, concepts, sources, categories, dates, languages, and more. Events are collections of articles (potentially in different languages) discussing the same real-world happening.

- Returns up to **50 events per call** (1 token per call).
- Paginate with `eventsPage` (2, 3, 4, ...) for additional results.
- Supports complex queries via the `query` parameter using the [Advanced Query Language](https://github.com/EventRegistry/event-registry-python/wiki/Searching-for-events#advanced-query-language).

## Parameters

### Required

| Parameter | Type | Description |
|-----------|------|-------------|
| `apiKey` | string | Your API key |

### Result Control

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `resultType` | string \| string[] | `events` | Result format. Values: `events`, `uriWgtList`, `timeAggr`, `locAggr`, `locTimeAggr`, `sourceAggr`, `authorAggr`, `keywordAggr`, `conceptAggr`, `conceptGraph`, `categoryAggr`, `breakingEvents`, `sentimentAggr`, `dateMentionAggr`, `recentActivityEvents` |
| `eventsPage` | integer | `1` | Page number (starting from 1) |
| `eventsCount` | integer | `50` | Events per page (max 50) |
| `eventsSortBy` | string | `date` | Sort by: `date`, `rel`, `size`, `socialScore` |
| `eventsSortByAsc` | boolean | `false` | Ascending sort order |
| `forceMaxDataTimeWindow` | integer | — | Limit to recent data: `7` or `31` days only |

### Filters

All standard filter parameters apply. See [Filtering Guide](../filtering.md). Event-specific filters:

| Parameter | Type | Description |
|-----------|------|-------------|
| `minArticlesInEvent` | integer | Minimum articles in event (any language) |
| `maxArticlesInEvent` | integer | Maximum articles in event (any language) |
| `minSentimentEvent` | integer | Minimum event sentiment (-1 to 1) |
| `maxSentimentEvent` | integer | Maximum event sentiment (-1 to 1) |
| `reportingDateStart` | string | Average publishing date >= this (YYYY-MM-DD) |
| `reportingDateEnd` | string | Average publishing date <= this (YYYY-MM-DD) |

Note: `dateStart`/`dateEnd` filter by *event date* (when it happened), which may differ from article publication dates. Use `reportingDateStart`/`reportingDateEnd` to filter by when articles were published.

### Returned Details

See [Response Details](../response-details.md) for `include*` parameters controlling event, story, concept, category, and location metadata.

## Examples

### Search by concept with relevance sorting

```bash
curl -X POST "https://eventregistry.org/api/v1/event/getEvents" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_API_KEY",
    "conceptUri": "http://en.wikipedia.org/wiki/Barack_Obama",
    "eventsSortBy": "rel",
    "eventsCount": 50
  }'
```

### Filter by article count and date range

```bash
curl -X POST "https://eventregistry.org/api/v1/event/getEvents" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_API_KEY",
    "keyword": "earthquake",
    "dateStart": "2024-01-01",
    "dateEnd": "2024-06-30",
    "minArticlesInEvent": 10,
    "eventsSortBy": "size"
  }'
```
