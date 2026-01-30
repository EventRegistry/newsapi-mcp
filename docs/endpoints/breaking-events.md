# Get Breaking Events

Retrieve currently trending/breaking events.

## Endpoint

```
GET | POST https://eventregistry.org/api/v1/event/getBreakingEvents
```

## Description

Returns a list of events that are currently trending or breaking — events receiving a surge of new articles.

## Parameters

### Required

| Parameter | Type | Description |
|-----------|------|-------------|
| `apiKey` | string | Your API key |

### Returned Details

Standard event `include*` parameters apply. See [Response Details](../response-details.md).

## Example

```bash
curl -X POST "https://eventregistry.org/api/v1/event/getBreakingEvents" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_API_KEY"
  }'
```
