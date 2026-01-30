# NewsAPI.ai (Event Registry) API Documentation

Complete reference documentation for the NewsAPI.ai REST API, powered by Event Registry.

## Table of Contents

- [Introduction](./introduction.md) — Overview, authentication, rate limits, SDKs
- [Terminology](./terminology.md) — Key concepts: articles, events, concepts, categories, sources, locations
- [Data Models](./data-models.md) — JSON schemas for articles, events, mentions, concepts, categories, sources
- **Core Endpoints**
  - [Get Articles](./endpoints/get-articles.md) — Search and retrieve news articles
  - [Get Events](./endpoints/get-events.md) — Search and retrieve events
  - [Get Mentions](./endpoints/get-mentions.md) — Sentence-level event type extraction
  - [Article Details](./endpoints/article-details.md) — Retrieve specific article(s) by URI
  - [Event Details](./endpoints/event-details.md) — Retrieve specific event(s) by URI
  - [Articles for Topic Page](./endpoints/articles-topic-page.md) — Articles matching a user-created topic page
  - [Events for Topic Page](./endpoints/events-topic-page.md) — Events matching a user-created topic page
- **Real-Time Streams**
  - [Stream Articles](./endpoints/stream-articles.md) — Real-time feed of new articles
  - [Stream Events](./endpoints/stream-events.md) — Real-time feed of new/updated events
  - [Breaking Events](./endpoints/breaking-events.md) — Currently trending events
- **Text Analytics**
  - [Annotate](./endpoints/annotate.md) — Named entity recognition
  - [Categorize](./endpoints/categorize.md) — Text categorization (DMOZ, News, IPTC)
  - [Sentiment](./endpoints/sentiment.md) — Sentiment analysis
  - [Semantic Similarity](./endpoints/semantic-similarity.md) — Cross-language document comparison
  - [Extract Article Info](./endpoints/extract-article-info.md) — Crawl URL and extract structured article data
  - [Detect Language](./endpoints/detect-language.md) — Language detection
  - [Train Topic](./endpoints/train-topic.md) — Train custom topic from documents
- **Autosuggest**
  - [Suggest Concepts](./endpoints/suggest-concepts.md) — Concept label → URI lookup
  - [Suggest Categories](./endpoints/suggest-categories.md) — Category label → URI lookup
  - [Suggest Sources](./endpoints/suggest-sources.md) — Source label → URI lookup
  - [Suggest Authors](./endpoints/suggest-authors.md) — Author label → URI lookup
  - [Suggest Locations](./endpoints/suggest-locations.md) — Location label → URI lookup
  - [Suggest Event Types](./endpoints/suggest-event-types.md) — Event type label → URI lookup
- **Other**
  - [API Usage](./endpoints/api-usage.md) — Token usage tracking
  - [Event for Text](./endpoints/event-for-text.md) — Match text to known events
- [Filtering Guide](./filtering.md) — Shared query parameters, advanced query language, ignore filters
- [Response Details](./response-details.md) — Controlling returned metadata with `include*` parameters

## Base URLs

| Service | Base URL |
|---------|----------|
| Main API | `https://eventregistry.org/api/v1/` |
| Text Analytics | `http://analytics.eventregistry.org/api/v1/` |

## Quick Start

```bash
# Search for articles mentioning "Tesla"
curl "https://eventregistry.org/api/v1/article/getArticles?apiKey=YOUR_API_KEY&keyword=Tesla&articlesCount=10"
```

## SDKs

- [Python SDK](https://github.com/EventRegistry/event-registry-python) ([Wiki](https://github.com/EventRegistry/event-registry-python/wiki))
- [Node.js SDK](https://github.com/EventRegistry/event-registry-node-js) ([Wiki](https://github.com/EventRegistry/event-registry-node-js/wiki))
- [OpenAPI Spec (YAML)](https://eventregistry.org/static/api.yaml)
