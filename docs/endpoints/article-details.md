# Get Article Details

Retrieve detailed information about one or more specific articles by their URI.

## Endpoint

```
GET | POST https://eventregistry.org/api/v1/article/getArticle
```

## Description

Fetch full details for specific articles when you already know their URI(s). This is useful for retrieving complete article data after obtaining URIs from search results or streams.

## Parameters

### Required

| Parameter | Type | Description |
|-----------|------|-------------|
| `apiKey` | string | Your API key |
| `articleUri` | string \| string[] | Article URI(s) to retrieve |

### Returned Details

All standard article `include*` parameters apply. See [Response Details](../response-details.md).

## Example

```bash
curl -X POST "https://eventregistry.org/api/v1/article/getArticle" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_API_KEY",
    "articleUri": "143701955",
    "includeArticleBody": true,
    "includeArticleConcepts": true,
    "includeArticleCategories": true
  }'
```
