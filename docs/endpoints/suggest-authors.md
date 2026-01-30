# Suggest Authors

Map an author name to its URI.

## Endpoint

```
GET | POST https://eventregistry.org/api/v1/suggestAuthorsFast
```

## Description

Given a full or partial author name, returns matching author URIs for use in `authorUri` filters.

## Parameters

### Required

| Parameter | Type | Description |
|-----------|------|-------------|
| `apiKey` | string | Your API key |
| `prefix` | string | Full or partial author name |

## Example

```bash
curl "https://eventregistry.org/api/v1/suggestAuthorsFast?apiKey=YOUR_API_KEY&prefix=Mark Mazzetti"
```
