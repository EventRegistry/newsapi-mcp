# Data Models

JSON schemas for the core data types returned by the API. Properties marked as *optional* require setting the corresponding `include*` parameter to `true` in the request (see [Response Details](./response-details.md)).

## Article Data Model

```jsonc
{
  // Unique article ID (not necessarily numeric)
  "uri": "143701955",
  // Original web URL
  "url": "http://www.example.com/article/123",
  // Article title
  "title": "Desperate Obama Tries to Reset Agenda with New Staff",
  // Full article body
  "body": "As Phil Schiliro arrived at his first meeting last ...",
  // Date and time we found the article (UTC), split fields
  "date": "2013-12-18",
  "time": "11:40:00",
  // ISO 8601 datetime when article was found and serialized (UTC)
  // Monotonically increasing as articles are added
  "dateTime": "2013-12-18T11:40:00Z",
  // Datetime from RSS feed or article metadata
  // Closest to when the article was actually identified
  // NOT monotonically increasing
  "dateTimePub": "2013-12-18T11:12:00Z",
  // ISO3 language code
  "lang": "eng",
  // Whether this article is a duplicate of another
  "isDuplicate": false,
  // Content type: "news", "blog", or "pr"
  "dataType": "news",
  // Sentiment score: -1 (very negative) to 1 (very positive), null if unavailable
  // Only computed for English articles
  "sentiment": -0.2,
  // Event URI this article belongs to (if any)
  "eventUri": "eng-2320588",
  // Relevance score for query matching (higher = better match)
  "relevance": 34,
  // Story/cluster URI this article belongs to (if any)
  "storyUri": "eng-2320588",
  // Article image URL
  "image": "https://cdn.example.com/image.jpg",
  // Source details (see Source data model)
  "source": { },
  // Assigned categories (see Category data model) [optional]
  "categories": [ ],
  // Associated concepts (see Concept data model) [optional]
  "concepts": [ ],
  // Article authors [optional]
  "authors": [
    {
      "uri": "john_doe@techcrunch.com",
      "name": "John Doe",
      "type": "author",
      "isAgency": false
    }
  ],
  // Links extracted from article body [optional]
  "links": [
    "https://example.com/related-article"
  ],
  // Videos extracted from article body [optional]
  "videos": [
    {
      "uri": "https://www.youtube.com/embed/abc123",
      "label": "Video Title"
    }
  ],
  // Social media share counts [optional]
  "shares": {
    "facebook": 1,
    "pinterest": 2
  },
  // URIs of duplicate articles [optional]
  "duplicateList": [],
  // Dates extracted from article text [optional]
  "extractedDates": [
    {
      "amb": false,           // Is the date ambiguous?
      "date": "2013-12-03",   // Normalized date
      "dateEnd": "2013-12-08",// End date (for ranges)
      "detectedDate": "Dec. 3-8", // Original text
      "imp": true,            // Was the year imputed?
      "posInText": 6164,      // Character position in text
      "textSnippet": "...A Dec. 3-8 poll of 86 competit..."
    }
  ],
  // Location from dateline (null if not extracted)
  "location": null,
  // If this is a duplicate, the original article object [optional]
  "originalArticle": null,
  // Cosine similarity to story centroid
  "sim": 0.3906,
  // Internal sorting parameter (DO NOT USE)
  "wgt": 12341243
}
```

## Event Data Model

```jsonc
{
  // Unique event URI
  "uri": "eng-2320588",
  // Title in available languages
  "title": {
    "eng": "Obama Resets White House Staff"
  },
  // Summary in available languages [optional]
  "summary": {
    "eng": "President Obama has reorganized..."
  },
  // Event date (when the event occurred, not when articles were published)
  "eventDate": "2013-12-18",
  // Event location (see Location sub-object)
  "location": { },
  // Article counts by language and total
  "articleCounts": {
    "eng": 150,
    "deu": 20,
    "total": 170
  },
  // Sentiment score: -1 to 1 [optional]
  "sentiment": -0.1,
  // Social media score [optional]
  "socialScore": 1234,
  // Associated concepts [optional]
  "concepts": [ ],
  // Associated categories [optional]
  "categories": [ ],
  // Common dates mentioned across articles [optional]
  "commonDates": [ ],
  // Stories (sub-clusters) within the event [optional]
  "stories": [ ],
  // Event images [optional, controlled by eventImageCount]
  "images": [ ]
}
```

## Mention Data Model

```jsonc
{
  // Unique mention URI
  "uri": "12345678",
  // The extracted sentence
  "sentence": "Company X announced the acquisition of Company Y for $2B.",
  // Event type URI
  "eventTypeUri": "et/business/acquisitions-mergers/acquisition/approved",
  // Sentiment of the sentence: -1 to 1
  "sentiment": 0.3,
  // Fact level: "fact", "opinion", or "forecast"
  "factLevel": "fact",
  // Language of the sentence
  "lang": "eng",
  // Publication date
  "date": "2023-04-15",
  "time": "14:30:00",
  // Source information
  "source": { },
  // URI of the original article
  "articleUri": "987654321",
  // URL of the original article
  "articleUrl": "https://example.com/article",
  // Sentence index within the article (0 = title, 1 = first body sentence)
  "sentenceIdx": 2,
  // Entities mentioned in the sentence (slots) [optional]
  "slots": { },
  // Categories [optional]
  "categories": [ ],
  // Framework associations [optional]
  "frameworks": {
    "sdg": [],
    "esg": [],
    "sasb": []
  }
}
```

## Concept Data Model

```jsonc
{
  // Unique concept URI (Wikipedia URL)
  "uri": "http://en.wikipedia.org/wiki/Barack_Obama",
  // Concept type: "person", "loc", "org", or "wiki" (non-entity)
  "type": "person",
  // Labels in various languages
  "label": {
    "eng": "Barack Obama",
    "deu": "Barack Obama",
    "spa": "Barack Obama"
  },
  // Synonyms [optional]
  "synonyms": {
    "eng": ["Barack Hussein Obama", "Obama"]
  },
  // Image URL [optional]
  "image": "https://upload.wikimedia.org/...",
  // Relevance/importance score
  // Article-level: 1-5, Event/story-level: 0-100
  "score": 4
}
```

## Category Data Model

```jsonc
{
  // Unique category URI
  "uri": "dmoz/Business/Accounting",
  // Category label
  "label": "Accounting",
  // Parent category URI [optional]
  "parentUri": "dmoz/Business",
  // Relevance weight (higher = more relevant)
  "wgt": 85
}
```

## News Source Data Model

```jsonc
{
  // Source URI (hostname)
  "uri": "bbc.co.uk",
  // Source title
  "title": "BBC",
  // Source description [optional]
  "description": "Breaking news, sport, TV, radio and more.",
  // Source location [optional]
  "location": {
    "country": {
      "label": { "eng": "United Kingdom" },
      "type": "country"
    }
  },
  // Source ranking [optional]
  "ranking": {
    "importanceRank": 1,
    "alexaGlobalRank": 100,
    "alexaCountryRank": 5
  }
}
```

## Location Sub-Object

```jsonc
{
  // Location type: "place", "country", "continent"
  "type": "country",
  // Labels
  "label": {
    "eng": "United States"
  },
  // Wikipedia concept URI
  "wikiUri": "http://en.wikipedia.org/wiki/United_States",
  // Geographic coordinates [optional]
  "lat": 38.8951,
  "long": -77.0364,
  // GeoNames ID [optional]
  "geoNamesId": 6252001,
  // Population [optional]
  "population": 331002651,
  // Area in km² [optional]
  "area": 9833520,
  // Continent [optional]
  "continent": "North America"
}
```
