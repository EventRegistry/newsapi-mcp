# Suggest Concepts

Map a concept label or prefix to its URI.

## Endpoint

```
GET | POST https://eventregistry.org/api/v1/suggestConceptsFast
```

## Description

Given a full or partial concept label, returns a list of matching concept URIs. Use this to obtain the `conceptUri` value needed for filtering in article/event/mention queries.

Results are sorted by frequency in Event Registry data. The first candidate is usually the correct one.

## Parameters

### Required

| Parameter | Type | Description |
|-----------|------|-------------|
| `apiKey` | string | Your API key |
| `prefix` | string | Full or partial concept name |

## Example

```bash
curl "https://eventregistry.org/api/v1/suggestConceptsFast?apiKey=YOUR_API_KEY&prefix=Obama"
```

Response returns an array of matching concepts with URIs like `http://en.wikipedia.org/wiki/Barack_Obama`.
