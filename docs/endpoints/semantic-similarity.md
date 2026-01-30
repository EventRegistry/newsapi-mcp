# Semantic Similarity

Compare two documents and compute their semantic similarity.

## Endpoint

```
GET | POST http://analytics.eventregistry.org/api/v1/semanticSimilarity
```

## Description

Compute the semantic similarity between two documents, which can be in different languages. The comparison is based on shared people, locations, organizations, and things identified in both documents.

## Parameters

### Required

| Parameter | Type | Description |
|-----------|------|-------------|
| `apiKey` | string | Your API key |
| `text1` | string | First document text |
| `text2` | string | Second document text |

## Example

```bash
curl -X POST "http://analytics.eventregistry.org/api/v1/semanticSimilarity" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_API_KEY",
    "text1": "President Biden met with European leaders to discuss climate policy.",
    "text2": "El presidente Biden se reunió con líderes europeos para discutir política climática."
  }'
```
