# Stream of New Articles

Get real-time access to news articles as they are added to Event Registry.

## Endpoint

```
GET | POST https://eventregistry.org/api/v1/minuteStreamArticles
```

## Description

Returns the full list of articles added in the last few minutes. Can be used unfiltered (all articles) or with filters for specific languages, sources, keywords, concepts, etc.

This is the **only endpoint** that can return more than 100 articles per call (up to 2,000). Token usage scales with results: 100 articles = 1 token, 250 articles = 3 tokens, etc.

**Intended usage**: Call repeatedly every 1+ minutes. Use `recentActivityArticles*UpdatesAfterUri` parameters for deduplication.

## Parameters

### Required

| Parameter | Type | Description |
|-----------|------|-------------|
| `apiKey` | string | Your API key |

### Stream Control

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `recentActivityArticlesMaxArticleCount` | integer | `100` | Max articles to return (up to 2,000). Token cost scales proportionally. |
| `recentActivityArticlesNewsUpdatesAfterUri` | string | — | Only return news articles added after this URI. **Recommended for deduplication.** |
| `recentActivityArticlesBlogUpdatesAfterUri` | string | — | Same as above, for blog content. |
| `recentActivityArticlesPrUpdatesAfterUri` | string | — | Same as above, for press releases. |
| `recentActivityArticlesUpdatesAfterMinsAgo` | integer | — | Return articles from the last N minutes (max 240 / 4 hours). Less accurate than URI-based dedup. |
| `recentActivityArticlesUpdatesAfterTm` | string | — | Return articles after this UTC datetime (`YYYY-MM-DDTHH:MM:SS`). Max 4 hours in the past. Less accurate than URI-based dedup. |

### Additional Filters

All standard article filters apply: `keyword`, `conceptUri`, `categoryUri`, `sourceUri`, `sourceLocationUri`, `sourceGroupUri`, `authorUri`, `locationUri`, `lang`, `dataType`, `keywordLoc`, `keywordOper`, `conceptOper`, `categoryOper`, `startSourceRankPercentile`, `endSourceRankPercentile`, `minSentiment`, `maxSentiment`, `isDuplicateFilter`, `eventFilter`.

See [Filtering Guide](../filtering.md) for details.

### Returned Details

All standard article `include*` parameters apply. See [Response Details](../response-details.md).

## Examples

### Basic stream (last minute, all articles)

```bash
curl -X POST "https://eventregistry.org/api/v1/minuteStreamArticles" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_API_KEY",
    "recentActivityArticlesMaxArticleCount": 100
  }'
```

### Continuous polling with deduplication (recommended)

```bash
# First call
curl -X POST "https://eventregistry.org/api/v1/minuteStreamArticles" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_API_KEY",
    "lang": "eng",
    "recentActivityArticlesMaxArticleCount": 200
  }'
# Response includes article URIs. Save the last URI.

# Subsequent calls — pass the last URI to avoid duplicates
curl -X POST "https://eventregistry.org/api/v1/minuteStreamArticles" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_API_KEY",
    "lang": "eng",
    "recentActivityArticlesMaxArticleCount": 200,
    "recentActivityArticlesNewsUpdatesAfterUri": "LAST_ARTICLE_URI"
  }'
```
