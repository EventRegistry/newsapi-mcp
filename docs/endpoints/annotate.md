# Annotate (Named Entity Recognition)

Identify people, locations, organizations, and things mentioned in text.

## Endpoint

```
GET | POST http://analytics.eventregistry.org/api/v1/annotate
```

## Description

Semantically annotate a document by identifying named entities. Each annotation receives a unique Wikipedia URI. Supports 100+ languages. The `url` property points to the concept in Wikipedia for the document's language; `secUrl` points to the English Wikipedia page if it exists.

## Parameters

### Required

| Parameter | Type | Description |
|-----------|------|-------------|
| `apiKey` | string | Your API key |
| `text` | string | Text to annotate |

### Optional

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `minLinkFrequency` | integer | `3` | Minimum times a phrase must appear as a link to be a candidate |
| `minLinkRelFrequency` | double | `0.01` | Minimum probability of text pointing to a candidate (0–1) |
| `nWordsToIgnoreFromList` | integer | `200` | Ignore phrases made of the N most frequent words. Set 0 to disable. |
| `minPMentionGivenPhrase` | double | `0.03` | Minimum probability of phrase being annotated with concept on Wikipedia |
| `pageRankSqThreshold` | double | `0.95` | PageRank-based filtering threshold |
| `applyPageRankSqThreshold` | boolean | — | Apply PageRank threshold filtering |

## Example

```bash
curl -X POST "http://analytics.eventregistry.org/api/v1/annotate" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_API_KEY",
    "text": "Barack Obama met with Angela Merkel in Berlin to discuss NATO."
  }'
```
