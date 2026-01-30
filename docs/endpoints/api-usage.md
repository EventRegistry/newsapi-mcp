# API Usage

Check your token usage and plan details.

## Endpoint

```
GET | POST https://eventregistry.org/api/v1/usage
```

## Description

Retrieve information about the number of tokens available in your data plan and how many you've used this month.

## Parameters

### Required

| Parameter | Type | Description |
|-----------|------|-------------|
| `apiKey` | string | Your API key |

## Example

```bash
curl "https://eventregistry.org/api/v1/usage?apiKey=YOUR_API_KEY"
```
