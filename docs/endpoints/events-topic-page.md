# Get Events for Topic Page

Retrieve events matching a user-created topic page.

## Endpoint

```
GET | POST https://eventregistry.org/api/v1/event/getEventsForTopicPage
```

## Description

Returns events matching a topic page's configuration, identified by its URI. Topic pages are created via the NewsAPI.ai web interface.

## Parameters

### Required

| Parameter | Type | Description |
|-----------|------|-------------|
| `apiKey` | string | Your API key |
| `uri` | string | Topic page URI |

### Result Control

Same pagination and sorting parameters as [Get Events](./get-events.md): `eventsPage`, `eventsCount`, `eventsSortBy`, `eventsSortByAsc`.

### Returned Details

All standard event `include*` parameters apply. See [Response Details](../response-details.md).

## Example

```bash
curl -X POST "https://eventregistry.org/api/v1/event/getEventsForTopicPage" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_API_KEY",
    "uri": "YOUR_TOPIC_PAGE_URI",
    "eventsCount": 30
  }'
```
