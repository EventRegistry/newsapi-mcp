# Get Mentions

Obtain sentences from news articles that mention a specific relation of interest (event type).

## Endpoint

```
GET | POST https://eventregistry.org/api/v1/article/getMentions
```

## Description

This endpoint extracts **sentence-level mentions** of specific event types from news articles. Event types represent relations like mergers, layoffs, product releases, natural disasters, etc. There are 100+ event types in the taxonomy.

Each returned "mention" is a sentence with metadata: sentiment, source info, entities, categories, and links to the original article.

- Returns up to **100 mentions per call**.
- Paginate with `mentionsPage`.
- Supports filtering by event type, industry, SDG/ESG/SASB frameworks, fact level, and more.

## Parameters

### Required

| Parameter | Type | Description |
|-----------|------|-------------|
| `apiKey` | string | Your API key |

### Result Control

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `resultType` | string | `mentions` | Values: `mentions`, `uriWgtList`, `langAggr`, `timeAggr`, `sourceAggr`, `sourceExAggr`, `keywordAggr`, `locAggr`, `locTimeAggr`, `conceptAggr`, `eventTypeAggr`, `categoryAggr`, `sentimentAggr`, `recentActivityMentions` |
| `mentionsPage` | integer | `1` | Page number |
| `mentionsCount` | integer | `100` | Mentions per page (max 100) |
| `mentionsSortBy` | string | `date` | Sort by: `date`, `rel`, `sourceImportance`, `sourceAlexaGlobalRank`, `sourceAlexaCountryRank` |
| `mentionsSortByAsc` | boolean | `false` | Ascending sort order |

### Mention-Specific Filters

| Parameter | Type | Description |
|-----------|------|-------------|
| `eventTypeUri` | string \| string[] | Filter by event type URI (e.g., `et/business/acquisitions-mergers/acquisition/approved`). Use [Suggest Event Types](./suggest-event-types.md) to find URIs. |
| `industryUri` | string \| string[] | Filter by company industry (e.g., `sectors/Communications`). |
| `sdgUri` | string \| string[] | Filter by UN Sustainable Development Goal (e.g., `sdg/sdg5_gender_equality`). |
| `sasbUri` | string \| string[] | Filter by SASB Materiality Map (e.g., `sasb/environment/air_quality`). |
| `esgUri` | string \| string[] | Filter by ESG category (e.g., `esg/environment`). |
| `factLevel` | string \| string[] | Factuality filter: `fact`, `opinion`, `forecast`. |
| `minSentenceIndex` | integer | Minimum sentence position (0 = title, 1 = first body sentence). |
| `maxSentenceIndex` | integer | Maximum sentence position. Set to 1 for title/first sentence only. |
| `showDuplicates` | boolean | Include duplicate sentences (default: `false`). |

All standard `ignore*` variants exist: `ignoreEventTypeUri`, `ignoreIndustryUri`, `ignoreSdgUri`, `ignoreSasbUri`, `ignoreEsgUri`, plus the standard keyword/concept/source/location ignore filters.

### Additional Filters

Standard filters also apply: `keyword`, `conceptUri`, `categoryUri`, `sourceUri`, `sourceLocationUri`, `sourceGroupUri`, `locationUri`, `dateStart`, `dateEnd`, `minSentiment`, `maxSentiment`, `startSourceRankPercentile`, `endSourceRankPercentile`, and their `ignore*` counterparts.

See [Filtering Guide](../filtering.md) for details.

### Returned Details

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `includeMentionBasicInfo` | boolean | `true` | Basic mention info (language, date, time) |
| `includeMentionSlots` | boolean | `false` | Entities mentioned in the sentence |
| `includeMentionCategories` | boolean | `false` | Article categories |
| `includeMentionFrameworks` | boolean | `false` | SDG, ESG, SASB framework associations |
| `includeSourceTitle` | boolean | `true` | Source title |
| `includeSourceLocation` | boolean | `false` | Source location |
| `includeConceptSynonyms` | boolean | `false` | Concept synonyms |
| `conceptLang` | string | `eng` | Language for concept labels |
| `includeLocationGeoLocation` | boolean | `false` | Latitude/longitude |

## Examples

### Find merger/acquisition mentions in transportation industry

```bash
curl -X POST "https://eventregistry.org/api/v1/article/getMentions" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_API_KEY",
    "eventTypeUri": "et/business/acquisitions-mergers/acquisition/approved",
    "industryUri": "sectors/Transportation",
    "dateStart": "2023-04-01",
    "dateEnd": "2023-04-30",
    "mentionsCount": 100
  }'
```
