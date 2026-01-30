# Stream of Events

Get real-time access to new and updated events.

## Endpoint

```
GET | POST https://eventregistry.org/api/v1/minuteStreamEvents
```

## Description

Returns events that were recently added or updated. Designed to be called repeatedly for continuous monitoring.

Use `recentActivityEventsUpdatesAfterUri` for deduplication between calls.

## Parameters

### Required

| Parameter | Type | Description |
|-----------|------|-------------|
| `apiKey` | string | Your API key |

### Stream Control

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `recentActivityEventsMaxEventCount` | integer | `50` | Max events to return |
| `recentActivityEventsUpdatesAfterUri` | string | — | Only return events updated after this URI. **Recommended for deduplication.** |
| `recentActivityEventsUpdatesAfterMinsAgo` | integer | — | Return events from last N minutes (max 240). |
| `recentActivityEventsUpdatesAfterTm` | string | — | Return events after this UTC datetime (`YYYY-MM-DDTHH:MM:SS`). |

### Additional Filters

Standard event filters apply. See [Filtering Guide](../filtering.md).

### Returned Details

Standard event `include*` parameters apply. See [Response Details](../response-details.md).

## Example

```bash
curl -X POST "https://eventregistry.org/api/v1/minuteStreamEvents" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_API_KEY",
    "recentActivityEventsMaxEventCount": 50
  }'
```
