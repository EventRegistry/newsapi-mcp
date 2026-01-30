# Extract Article Information

Crawl a URL and extract structured article data.

## Endpoint

```
GET | POST http://analytics.eventregistry.org/api/v1/extractArticleInfo
```

## Description

Given an article URL, crawl the page and extract structured information: title, body, authors, publishing date, image, links, videos, and other available metadata.

## Parameters

### Required

| Parameter | Type | Description |
|-----------|------|-------------|
| `apiKey` | string | Your API key |
| `url` | string | Article URL to crawl and extract |

## Example

```bash
curl -X POST "http://analytics.eventregistry.org/api/v1/extractArticleInfo" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_API_KEY",
    "url": "https://www.bbc.com/news/technology-12345678"
  }'
```
