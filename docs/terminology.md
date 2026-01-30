# Terminology

Key terms and concepts used throughout the NewsAPI.ai API.

## Article

A news article collected and imported into Event Registry via RSS feeds. Articles contain:
- Title, body, publication date/time
- Source (news publisher)
- Image, authors, links, videos
- Assigned concepts, categories, extracted dates
- Sentiment score (English only)
- Data type: `news`, `blog`, or `pr` (press release)

See [Article data model](./data-models.md#article-data-model) for the full JSON schema.

## Event

A collection of news articles (potentially in multiple languages) that discuss the same real-world happening. Events provide:
- Title and summary (in all available languages)
- Date and location of occurrence
- List of stories (sub-clusters)
- Article counts, concepts, categories
- Sentiment score

Events are distinct from articles — an event's date reflects *when something happened*, not when articles were published.

See [Event data model](./data-models.md#event-data-model) for the full JSON schema.

## Story

A sub-cluster within an event. Events can have multiple stories representing different angles or sub-topics of the same happening. Stories contain articles that are closely related within the broader event.

## Concept

An annotation assigned to articles, stories, or events. Concepts represent:
- **Entities**: people, locations, organizations
- **Non-entities/keywords**: things (table, robot, personal computer, etc.)

### Concept URIs

Every concept has a unique URI based on its Wikipedia URL:
- Barack Obama → `http://en.wikipedia.org/wiki/Barack_Obama`
- White House → `http://en.wikipedia.org/wiki/White_House`

Concepts enable **cross-language search** — searching by concept URI finds mentions in all languages, unlike keyword search which is language-specific.

### Concept Scores

- **Article-level**: Score 1–5 indicating relevance (5 = highly relevant)
- **Event/story-level**: Score 0–100 indicating importance to the event

Use the [Suggest Concepts](./endpoints/suggest-concepts.md) endpoint to map a label to its URI.

## Category

A topic classification assigned to articles, stories, and events using machine learning. Categories don't represent specific mentions — they describe what the content is *about*.

### Taxonomies

| Taxonomy | Categories | Languages | Levels | Notes |
|----------|-----------|-----------|--------|-------|
| **DMOZ** | ~50,000 | English only | 3 | Detailed topic hierarchy from [DMOZ/ODP](https://dmoz-odp.org/) |
| **News** | 8 | All languages | 1 | Broad news categories |
| **IPTC** | ~1,000 | All languages | 3 | [IPTC subject codes](https://iptc.org/standards/subject-codes/) |

### News Category URIs

- `news/Business`
- `news/Politics`
- `news/Technology`
- `news/Environment`
- `news/Health`
- `news/Science`
- `news/Sports`
- `news/Arts_and_Entertainment`

For broader categorization, prefer the News taxonomy over DMOZ.

## Source

A news publisher associated with articles. Sources have:
- URI (hostname, e.g., `bbc.co.uk`)
- Title, description
- Geographic location
- Importance ranking

## Location

A geographic location from [GeoNames](http://www.geonames.org/), associated with stories, events, sources, and location-type concepts. Properties include GeoNames ID, Wikipedia URL, population, geolocation coordinates, area, and continent.

## Mention

A sentence extracted from a news article that describes a specific **event type** relation (e.g., merger, layoff, product launch, natural disaster). Mentions contain:
- The sentence text
- Event type classification
- Sentiment
- Source information
- Referenced entities
- Fact level (fact, opinion, forecast)

## Event Type

A taxonomy of 100+ real-world relation types that can be identified at the sentence level. Examples:
- `et/business/acquisitions-mergers/acquisition/approved`
- Stock price changes, layoffs, product releases, natural disasters, etc.

Event types can be associated with frameworks like SDG, ESG, and SASB.
