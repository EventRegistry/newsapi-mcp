# Suggest Categories

Map a category label or prefix to its URI.

## Endpoint

```
GET | POST https://eventregistry.org/api/v1/suggestCategoriesFast
```

## Description

Given a full or partial category name, returns matching category URIs for use in `categoryUri` filters.

## Parameters

### Required

| Parameter | Type | Description |
|-----------|------|-------------|
| `apiKey` | string | Your API key |
| `prefix` | string | Full or partial category name |

## Example

```bash
curl "https://eventregistry.org/api/v1/suggestCategoriesFast?apiKey=YOUR_API_KEY&prefix=Business"
```
