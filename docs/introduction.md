# Introduction

NewsAPI.ai is a news intelligence platform powered by Event Registry. It collects news articles via RSS feeds, enriches them with metadata (concepts, categories, sentiment), and groups related articles into **events** and **stories**.

## Registration & Authorization

- Register at [newsapi.ai/register](https://newsapi.ai/register) (free, gives 2,000 tokens for testing).
- Find your API key on the [settings page](https://newsapi.ai/settings?tab=settings).
- Pass the key as `apiKey` in every request (query parameter or JSON body).
- For more than 2,000 tokens, subscribe to a [paid plan](https://newsapi.ai/plans).

## Base URLs

| Service | Base URL |
|---------|----------|
| Main API | `https://eventregistry.org/api/v1/` |
| Text Analytics | `http://analytics.eventregistry.org/api/v1/` |

All endpoints accept `GET` and `POST` requests with `Content-Type: application/json`.

## SDKs

| Language | Repository | Documentation |
|----------|-----------|---------------|
| Python | [event-registry-python](https://github.com/EventRegistry/event-registry-python) | [Wiki](https://github.com/EventRegistry/event-registry-python/wiki) |
| Node.js | [event-registry-node-js](https://github.com/EventRegistry/event-registry-node-js) | [Wiki](https://github.com/EventRegistry/event-registry-node-js/wiki) |

## OpenAPI Specification

The full API specification is available as a [YAML file](https://eventregistry.org/static/api.yaml).

## Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success. Everything worked as expected. |
| 204 | Information not available. Request succeeded but no data found. |
| 400 | Bad request. Invalid or missing parameter. |
| 401 | User's limit reached. Token quota exhausted. |
| 403 | Forbidden. IP/account disabled or tokens depleted. |
| 429 | Too many requests. Exceeded simultaneous request limit. |
| 500 | Internal server error. |
| 503 | Service unavailable. |

## Rate Limiting

- Maximum **5 simultaneous requests** at any time.
- Exceeding this returns a `503` status code.
- Recommended approach: make requests **sequentially**, not in parallel.

## Query Condition Limits

Different maximums for free vs paid users per single query:

| Condition Type | Free | Paid |
|---------------|------|------|
| Sources | 1,000 | 50,000 |
| Keywords | 15 | 60 |
| Concepts | 15 | 60 |
| Categories | 10 | 20 |
| Languages | 5 | 10 |

## Token Consumption

- Each article search call costs **1 token** (regardless of articles returned, up to 100).
- Each event search call costs **1 token** (up to 50 events).
- The `minuteStreamArticles` endpoint can return up to 2,000 articles; tokens scale with results (e.g., 250 articles = 3 tokens).
