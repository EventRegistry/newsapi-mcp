# Response Details

Control what metadata is returned in API responses using `include*` parameters. These apply to [Get Articles](./endpoints/get-articles.md), [Get Events](./endpoints/get-events.md), and [Get Mentions](./endpoints/get-mentions.md).

## Article Include Parameters

Used with `getArticles`, `getArticle`, and streaming endpoints.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `includeArticleBasicInfo` | boolean | `true` | Basic article fields: `uri`, `url`, `title`, `body`, `dateTime`, `dateTimePub`, `lang`, `isDuplicate`, `dataType` |
| `includeArticleTitle` | boolean | `true` | Article title |
| `includeArticleBody` | boolean | `true` | Article body text |
| `includeArticleEventUri` | boolean | `true` | URI of the event this article belongs to |
| `includeArticleStoryUri` | boolean | `false` | URI of the story (sub-event cluster) |
| `includeArticleDuplicateList` | boolean | `false` | List of duplicate article URIs |
| `includeArticleOriginalArticle` | boolean | `false` | Original article if this is a duplicate |
| `includeArticleCategories` | boolean | `false` | Assigned categories |
| `includeArticleConcepts` | boolean | `false` | Extracted concepts (entities and topics) |
| `includeArticleImage` | boolean | `false` | Article image URL |
| `includeArticleVideos` | boolean | `false` | Embedded video URLs |
| `includeArticleLinks` | boolean | `false` | Outbound links in the article |
| `includeArticleExtractedDates` | boolean | `false` | Dates mentioned in article text |
| `includeArticleLocation` | boolean | `false` | Location identified for the article |
| `includeArticleSocialScore` | boolean | `false` | Social media share counts |
| `includeArticleSentiment` | boolean | `false` | Sentiment score (-1 to 1) |
| `includeArticleAuthors` | boolean | `false` | Article authors |

## Event Include Parameters

Used with `getEvents` and `getEvent`.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `includeEventBasicInfo` | boolean | `true` | Basic event fields: `uri`, `title`, `date`, `summary`, `articleCounts` |
| `includeEventTitle` | boolean | `true` | Event title (in requested language) |
| `includeEventSummary` | boolean | `false` | Short summary of the event |
| `includeEventArticleCounts` | boolean | `true` | Total and per-language article counts |
| `includeEventConcepts` | boolean | `false` | Key concepts associated with the event |
| `includeEventCategories` | boolean | `false` | Categories assigned to the event |
| `includeEventLocation` | boolean | `false` | Location where the event occurred |
| `includeEventStories` | boolean | `false` | Stories (sub-clusters) within the event |
| `includeEventSocialScore` | boolean | `false` | Social media engagement score |
| `includeEventSentiment` | boolean | `false` | Average event sentiment |
| `includeEventImages` | boolean | `false` | Representative images |
| `includeEventCommonDates` | boolean | `false` | Most frequently mentioned dates |
| `includeEventMultiLingInfo` | boolean | `false` | Titles and summaries in all available languages |

## Mention Include Parameters

Used with `getMentions`.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `includeMentionBasicInfo` | boolean | `true` | Basic mention fields: language, date, time |
| `includeMentionSlots` | boolean | `false` | Entities in the sentence (slot filling) |
| `includeMentionCategories` | boolean | `false` | Categories of the parent article |
| `includeMentionFrameworks` | boolean | `false` | SDG, ESG, SASB framework associations |

## Source Include Parameters

Shared across endpoints returning source metadata.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `includeSourceTitle` | boolean | `true` | Source name |
| `includeSourceDescription` | boolean | `false` | Source description |
| `includeSourceLocation` | boolean | `false` | Source geographic location |
| `includeSourceRanking` | boolean | `false` | Source importance ranking |
| `includeSourceStatistics` | boolean | `false` | Publishing statistics (article counts) |

## Concept Include Parameters

Shared across endpoints returning concept metadata.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `includeConceptLabel` | boolean | `true` | Concept label/name |
| `includeConceptDescription` | boolean | `false` | Concept description from Wikipedia |
| `includeConceptSynonyms` | boolean | `false` | Alternative names |
| `includeConceptImage` | boolean | `false` | Concept image URL |
| `includeConceptTrendingScore` | boolean | `false` | Current trending score |
| `conceptLang` | string | `eng` | Language for concept labels (e.g., `eng`, `deu`, `fra`) |

## Category Include Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `includeCategoryParentUri` | boolean | `false` | URI of the parent category |

## Location Include Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `includeLocationGeoLocation` | boolean | `false` | Latitude and longitude |
| `includeLocationPopulation` | boolean | `false` | Population data |
| `includeLocationCountryArea` | boolean | `false` | Country area in km² |
| `includeLocationCountryContinent` | boolean | `false` | Continent of the country |

## Story Include Parameters

Used when events include story data.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `includeStoryBasicStats` | boolean | `false` | Story article counts and date range |
| `includeStoryTitle` | boolean | `false` | Story title |
| `includeStorySummary` | boolean | `false` | Story summary |
| `includeStoryConcepts` | boolean | `false` | Key concepts in the story |
| `includeStoryCategories` | boolean | `false` | Categories assigned to the story |
| `includeStoryLocation` | boolean | `false` | Story location |
| `includeStoryDate` | boolean | `false` | Story date |
| `includeStoryMedoidArticle` | boolean | `false` | Most representative article |

## Usage Notes

- Default `true` parameters are included automatically — no need to set them explicitly.
- Set `include*=false` to reduce payload size when you don't need certain fields.
- Enabling many `include*` parameters increases response size but does **not** cost additional tokens.
- The `conceptLang` parameter affects all concept labels across the response.
