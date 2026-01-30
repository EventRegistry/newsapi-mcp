# Suggest Event Types

Map an event type label to its URI.

## Endpoint

```
GET | POST https://eventregistry.org/api/v1/suggestEventTypes
```

## Description

Given a full or partial event type name, returns matching event type URIs for use in the `eventTypeUri` filter in [Get Mentions](./get-mentions.md).

Event types represent real-world relations: mergers, layoffs, product releases, natural disasters, stock price changes, etc.

## Parameters

### Required

| Parameter | Type | Description |
|-----------|------|-------------|
| `apiKey` | string | Your API key |
| `prefix` | string | Full or partial event type name |

## Example

```bash
curl "https://eventregistry.org/api/v1/suggestEventTypes?apiKey=YOUR_API_KEY&prefix=acquisition"
```

Returns URIs like `et/business/acquisitions-mergers/acquisition/approved`.
