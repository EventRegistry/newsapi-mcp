# Detect Language

Detect the language of a given text.

## Endpoint

```
GET | POST http://analytics.eventregistry.org/api/v1/detectLanguage
```

## Description

Detects the language in which the provided text is written. Returns a reliability indicator and a ranked list of likely languages with probabilities. Languages are provided using both ISO1 and ISO3 codes.

## Parameters

### Required

| Parameter | Type | Description |
|-----------|------|-------------|
| `apiKey` | string | Your API key |
| `text` | string | Text to detect language for |

## Example

```bash
curl -X POST "http://analytics.eventregistry.org/api/v1/detectLanguage" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_API_KEY",
    "text": "Die Bundesregierung hat neue Maßnahmen beschlossen."
  }'
```
