# Sentiment Analysis

Compute sentiment expressed in text.

## Endpoint

```
GET | POST http://analytics.eventregistry.org/api/v1/sentiment
```

## Description

Analyze the sentiment of a text using either a vocabulary-based or neural-network (RNN) approach. Returns an average sentiment for the full text plus sentence-by-sentence breakdown.

Sentiment values range from **-1** (very negative) to **1** (very positive), with 0 being neutral.

**English only.**

## Parameters

### Required

| Parameter | Type | Description |
|-----------|------|-------------|
| `apiKey` | string | Your API key |
| `text` | string | Text to analyze |

### Optional

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `method` | string | `vocabulary` | Approach: `vocabulary` (word-level scores) or `rnn` (neural network) |
| `sentences` | integer | `10` | Number of sentences to compute sentiment for |

## Example

```bash
curl -X POST "http://analytics.eventregistry.org/api/v1/sentiment" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_API_KEY",
    "text": "The company reported record profits this quarter, exceeding all analyst expectations.",
    "method": "rnn"
  }'
```
