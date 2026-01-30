# Suggest Locations

Map a location name to its URI.

## Endpoint

```
GET | POST https://eventregistry.org/api/v1/suggestLocationsFast
```

## Description

Given a full or partial location name, returns matching location URIs for use in `locationUri`, `sourceLocationUri`, and related filters.

## Parameters

### Required

| Parameter | Type | Description |
|-----------|------|-------------|
| `apiKey` | string | Your API key |
| `prefix` | string | Full or partial location name |

## Example

```bash
curl "https://eventregistry.org/api/v1/suggestLocationsFast?apiKey=YOUR_API_KEY&prefix=Germany"
```
