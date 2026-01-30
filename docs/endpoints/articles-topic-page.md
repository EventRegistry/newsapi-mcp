# Get Articles for Topic Page

Retrieve articles matching a user-created topic page.

## Endpoint

```
GET | POST https://eventregistry.org/api/v1/article/getArticlesForTopicPage
```

## Description

Topic pages are predefined search queries created via the NewsAPI.ai web interface. This endpoint returns articles matching a topic page's configuration, identified by its URI.

## Parameters

### Required

| Parameter | Type | Description |
|-----------|------|-------------|
| `apiKey` | string | Your API key |
| `uri` | string | Topic page URI |

### Result Control

Same pagination and sorting parameters as [Get Articles](./get-articles.md): `articlesPage`, `articlesCount`, `articlesSortBy`, `articlesSortByAsc`, `articleBodyLen`.

### Returned Details

All standard article `include*` parameters apply. See [Response Details](../response-details.md).

## Example

```bash
curl -X POST "https://eventregistry.org/api/v1/article/getArticlesForTopicPage" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_API_KEY",
    "uri": "YOUR_TOPIC_PAGE_URI",
    "articlesCount": 50
  }'
```
