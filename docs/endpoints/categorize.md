# Categorize

Classify text into predefined categories.

## Endpoint

```
GET | POST http://analytics.eventregistry.org/api/v1/categorize
```

## Description

Compute a list of categories that summarize the provided text. Three taxonomies are available:

| Taxonomy | Categories | Languages | Description |
|----------|-----------|-----------|-------------|
| `dmoz` | ~5,000 | English only | 3-level hierarchy from DMOZ/ODP. General to specific topics. |
| `news` | 8 | All languages | Broad news categories (Business, Politics, Technology, etc.) |
| `iptc` | ~1,000 | All languages | 3-level hierarchy from [IPTC subject codes](https://iptc.org/standards/subject-codes/) |

Works best on documents of decent length (e.g., full news articles).

## Parameters

### Required

| Parameter | Type | Description |
|-----------|------|-------------|
| `apiKey` | string | Your API key |
| `text` | string | Text to categorize |
| `taxonomy` | string | Taxonomy to use: `dmoz`, `news`, or `iptc` |

## Examples

### DMOZ taxonomy

```bash
curl -X POST "http://analytics.eventregistry.org/api/v1/categorize" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_API_KEY",
    "text": "Apple Inc reported strong quarterly earnings...",
    "taxonomy": "dmoz"
  }'
```

### News taxonomy (multilingual)

```bash
curl -X POST "http://analytics.eventregistry.org/api/v1/categorize" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_API_KEY",
    "text": "Die Bundesregierung hat neue Klimaschutzmaßnahmen beschlossen...",
    "taxonomy": "news"
  }'
```
