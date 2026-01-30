# Get Event Details

Retrieve detailed information about one or more specific events by their URI.

## Endpoint

```
GET | POST https://eventregistry.org/api/v1/event/getEvent
```

## Description

Fetch full details for specific events when you already know their URI(s). Returns event metadata, articles, concepts, categories, and more.

## Parameters

### Required

| Parameter | Type | Description |
|-----------|------|-------------|
| `apiKey` | string | Your API key |
| `eventUri` | string \| string[] | Event URI(s) to retrieve |

### Returned Details

All standard event and story `include*` parameters apply. See [Response Details](../response-details.md).

## Example

```bash
curl -X POST "https://eventregistry.org/api/v1/event/getEvent" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_API_KEY",
    "eventUri": "eng-2320588",
    "includeEventSummary": true,
    "includeEventConcepts": true,
    "includeEventCategories": true,
    "includeEventStories": true
  }'
```
