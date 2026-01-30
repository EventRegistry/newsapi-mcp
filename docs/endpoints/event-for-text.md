# Get Event for Text

Match input text to a known event in Event Registry.

## Endpoint

```
GET | POST https://eventregistry.org/api/v1/event/getEventForText
```

## Description

Given a text (e.g., a news article), identify which event in Event Registry it corresponds to. Useful for linking external content to Event Registry events.

## Parameters

### Required

| Parameter | Type | Description |
|-----------|------|-------------|
| `apiKey` | string | Your API key |
| `text` | string | Text to match against known events |

## Example

```bash
curl -X POST "https://eventregistry.org/api/v1/event/getEventForText" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_API_KEY",
    "text": "A 7.1 magnitude earthquake struck central Mexico on September 19, causing widespread damage."
  }'
```
