# Suggest Sources

Map a source name or prefix to its URI.

## Endpoint

```
GET | POST https://eventregistry.org/api/v1/suggestSourcesFast
```

## Description

Given a full or partial news source name, returns matching source URIs for use in `sourceUri` filters.

## Parameters

### Required

| Parameter | Type | Description |
|-----------|------|-------------|
| `apiKey` | string | Your API key |
| `prefix` | string | Full or partial source name |

## Example

```bash
curl "https://eventregistry.org/api/v1/suggestSourcesFast?apiKey=YOUR_API_KEY&prefix=BBC"
```
