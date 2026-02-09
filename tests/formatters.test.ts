import { describe, it, expect } from "vitest";
import {
  formatSuggestLocations,
  formatSuggestConcepts,
  formatSuggestSources,
  formatSuggestCategories,
  formatSuggestAuthors,
  formatArticleResults,
  formatArticleDetails,
  formatEventResults,
  formatEventDetails,
  formatUsageResults,
} from "../src/formatters.js";

describe("formatSuggestLocations", () => {
  it("formats location with country as numbered text", () => {
    const data = [
      {
        type: "place",
        label: { eng: "Ljubljana" },
        wikiUri: "http://en.wikipedia.org/wiki/Ljubljana",
        score: 272220,
        country: {
          label: { eng: "Slovenia" },
          wikiUri: "http://en.wikipedia.org/wiki/Slovenia",
        },
      },
    ];

    const result = formatSuggestLocations(data, {});

    expect(result).toContain("1. Ljubljana [place] - Slovenia");
    expect(result).toContain("http://en.wikipedia.org/wiki/Ljubljana");
  });

  it("returns no results message for empty array", () => {
    expect(formatSuggestLocations([], {})).toBe("No results found.");
    expect(formatSuggestLocations(null, {})).toBe("No results found.");
  });

  it("handles location without country", () => {
    const data = [
      {
        type: "country",
        label: { eng: "Slovenia" },
        wikiUri: "http://en.wikipedia.org/wiki/Slovenia",
        score: 500000,
      },
    ];

    const result = formatSuggestLocations(data, {});

    expect(result).toContain("1. Slovenia [country]");
    expect(result).toContain("http://en.wikipedia.org/wiki/Slovenia");
    expect(result).not.toContain(" - ");
  });
});

describe("formatSuggestConcepts", () => {
  it("formats concept as numbered text", () => {
    const data = [
      {
        label: "Donald Trump",
        type: "person",
        uri: "http://en.wikipedia.org/wiki/Donald_Trump",
        score: 26939520,
      },
    ];

    const result = formatSuggestConcepts(data, {});

    expect(result).toContain("1. Donald Trump [person]");
    expect(result).toContain("http://en.wikipedia.org/wiki/Donald_Trump");
  });

  it("returns no results message for empty array", () => {
    expect(formatSuggestConcepts([], {})).toBe("No results found.");
  });

  it("formats multiple concepts as numbered entries", () => {
    const data = [
      {
        label: "Apple Inc.",
        type: "org",
        uri: "http://en.wikipedia.org/wiki/Apple_Inc.",
        score: 1000000,
      },
      {
        label: "Apple",
        type: "wiki",
        uri: "http://en.wikipedia.org/wiki/Apple",
        score: 500000,
      },
    ];

    const result = formatSuggestConcepts(data, {});

    expect(result).toContain("1. Apple Inc. [org]");
    expect(result).toContain("http://en.wikipedia.org/wiki/Apple_Inc.");
    expect(result).toContain("2. Apple [wiki]");
    expect(result).toContain("http://en.wikipedia.org/wiki/Apple");
  });
});

describe("formatSuggestSources", () => {
  it("formats source as numbered text", () => {
    const data = [
      {
        title: "MMC RTV Slovenija",
        uri: "rtvslo.si",
        dataType: "news",
        score: 226385,
      },
    ];

    const result = formatSuggestSources(data, {});

    expect(result).toContain("1. MMC RTV Slovenija [news]");
    expect(result).toContain("rtvslo.si");
  });

  it("returns no results message for empty array", () => {
    expect(formatSuggestSources([], {})).toBe("No results found.");
  });

  it("handles missing title gracefully", () => {
    const data = [{ uri: "example.com", dataType: "blog", score: 100 }];

    const result = formatSuggestSources(data, {});

    expect(result).toContain("1. Unknown [blog]");
    expect(result).toContain("example.com");
  });
});

describe("formatSuggestCategories", () => {
  it("formats category as numbered text", () => {
    const data = [
      {
        label: "news/Technology",
        uri: "news/Technology",
        parentUri: "news",
      },
    ];

    const result = formatSuggestCategories(data, {});

    expect(result).toContain("1. news/Technology");
    expect(result).toContain("news/Technology");
  });

  it("returns no results message for empty array", () => {
    expect(formatSuggestCategories([], {})).toBe("No results found.");
  });

  it("handles category without parent", () => {
    const data = [
      {
        label: "news",
        uri: "news",
      },
    ];

    const result = formatSuggestCategories(data, {});

    expect(result).toContain("1. news");
    expect(result).toContain("   news");
  });
});

describe("formatSuggestAuthors", () => {
  it("formats author as numbered text", () => {
    const data = [
      {
        name: "John Smith",
        type: "author",
        uri: "john_smith@express.co.uk",
      },
    ];

    const result = formatSuggestAuthors(data, {});

    expect(result).toContain("1. John Smith");
    expect(result).toContain("john_smith@express.co.uk");
  });

  it("returns no results message for empty array", () => {
    expect(formatSuggestAuthors([], {})).toBe("No results found.");
  });

  it("handles missing name gracefully", () => {
    const data = [{ uri: "test@example.com", type: "author" }];

    const result = formatSuggestAuthors(data, {});

    expect(result).toContain("1. Unknown");
    expect(result).toContain("test@example.com");
  });

  it("includes source when present", () => {
    const data = [
      {
        name: "Jane Doe",
        uri: "jane_doe@nytimes.com",
        source: { title: "New York Times" },
      },
    ];

    const result = formatSuggestAuthors(data, {});

    expect(result).toContain("1. Jane Doe (New York Times)");
    expect(result).toContain("jane_doe@nytimes.com");
  });
});

describe("formatArticleResults", () => {
  it("formats articles with title, date, source, and body", () => {
    const data = {
      articles: {
        results: [
          {
            title: "Test Article",
            dateTimePub: "2024-01-15T10:00:00Z",
            source: { title: "Test Source" },
            body: "Article body content here.",
            url: "https://example.com/article",
          },
        ],
        page: 1,
        pages: 1,
      },
    };

    const result = formatArticleResults(data, {});

    expect(result).toContain("[2024-01-15]");
    expect(result).toContain("Test Article");
    expect(result).toContain("Test Source");
    expect(result).toContain("Article body content here.");
    expect(result).toContain("URL: https://example.com/article");
  });

  it("returns no articles message for empty results", () => {
    expect(formatArticleResults({ articles: { results: [] } }, {})).toBe(
      "No articles found.",
    );
    expect(formatArticleResults({}, {})).toBe("No articles found.");
  });

  it("includes pagination footer when multiple pages", () => {
    const data = {
      articles: {
        results: [{ title: "Test", body: "Body" }],
        page: 1,
        pages: 5,
        totalResults: 50,
      },
    };

    const result = formatArticleResults(data, {});

    expect(result).toContain("1 results (50 total)");
    expect(result).toContain("Page 1 of 5");
    expect(result).toContain("articlesPage: 2");
  });

  it("shows result count on single-page response", () => {
    const data = {
      articles: {
        results: [
          { title: "A", body: "Body A" },
          { title: "B", body: "Body B" },
        ],
        page: 1,
        pages: 1,
        totalResults: 2,
      },
    };

    const result = formatArticleResults(data, {});

    expect(result).toContain("2 results (2 total)");
    expect(result).not.toContain("Page ");
    expect(result).not.toContain("articlesPage:");
  });

  it("handles missing fields gracefully", () => {
    const data = {
      articles: {
        results: [
          {
            // No title, date, source, or URL
            body: "Just body",
          },
        ],
        page: 1,
        pages: 1,
      },
    };

    const result = formatArticleResults(data, {});

    expect(result).toContain("Untitled");
    expect(result).toContain("Unknown");
    expect(result).toContain("Just body");
    expect(result).not.toContain("URL:");
  });

  it("renders includeFields extras when present", () => {
    const data = {
      articles: {
        results: [
          {
            title: "Test",
            dateTimePub: "2024-01-15T10:00:00Z",
            source: { title: "Src" },
            body: "Body text.",
            sentiment: 0.52,
            concepts: [
              {
                label: "Tesla",
                type: "org",
                uri: "http://en.wikipedia.org/wiki/Tesla,_Inc.",
              },
              { label: "Artificial intelligence", type: "concept" },
            ],
            categories: [
              { label: "news/Technology", uri: "news/Technology" },
              { label: "news/Business", uri: "news/Business" },
            ],
            authors: [{ name: "John Smith", uri: "john_smith@example.com" }],
            image: "https://example.com/img.jpg",
            shares: { facebook: 120, twitter: 45 },
            eventUri: "eng-123",
            storyUri: "story-456",
            lang: "eng",
            isDuplicate: false,
          },
        ],
        page: 1,
        pages: 1,
      },
    };

    const result = formatArticleResults(data, {});

    expect(result).toContain("Sentiment: 0.52");
    expect(result).toContain(
      "Concepts: Tesla [org], Artificial intelligence [concept]",
    );
    expect(result).toContain("Categories: news/Technology, news/Business");
    expect(result).toContain("Authors: John Smith");
    expect(result).toContain("Image: https://example.com/img.jpg");
    expect(result).toContain("Shares: facebook: 120, twitter: 45");
    expect(result).toContain("Event: eng-123");
    expect(result).toContain("Story: story-456");
    expect(result).toContain("lang: eng");
    expect(result).toContain("isDuplicate: false");
  });

  it("renders location with object label", () => {
    const data = {
      articles: {
        results: [
          {
            title: "Test",
            body: "",
            location: { label: { eng: "Ljubljana" }, type: "place" },
          },
        ],
        page: 1,
        pages: 1,
      },
    };

    const result = formatArticleResults(data, {});
    expect(result).toContain("Location: Ljubljana");
  });

  it("does not render extras when fields are absent", () => {
    const data = {
      articles: {
        results: [
          {
            title: "Plain",
            dateTimePub: "2024-01-01T00:00:00Z",
            source: { title: "Src" },
            body: "Body",
          },
        ],
        page: 1,
        pages: 1,
      },
    };

    const result = formatArticleResults(data, {});

    expect(result).not.toContain("Sentiment:");
    expect(result).not.toContain("Concepts:");
    expect(result).not.toContain("Categories:");
    expect(result).not.toContain("Authors:");
    expect(result).not.toContain("Image:");
    expect(result).not.toContain("Shares:");
    expect(result).not.toContain("Event:");
    expect(result).not.toContain("Location:");
  });
});

describe("formatEventResults", () => {
  it("formats events with title, date, summary, and article count", () => {
    const data = {
      events: {
        results: [
          {
            title: { eng: "Major Event" },
            eventDate: "2024-01-15",
            summary: { eng: "Summary of the event." },
            articleCounts: { total: 150 },
            uri: "evt-123",
          },
        ],
        page: 1,
        pages: 1,
      },
    };

    const result = formatEventResults(data, {});

    expect(result).toContain("[2024-01-15]");
    expect(result).toContain("Major Event");
    expect(result).toContain("150 articles");
    expect(result).toContain("Summary of the event.");
    expect(result).toContain("URI: evt-123");
  });

  it("handles string title and summary", () => {
    const data = {
      events: {
        results: [
          {
            title: "String Title",
            summary: "String Summary",
            uri: "evt-456",
          },
        ],
        page: 1,
        pages: 1,
      },
    };

    const result = formatEventResults(data, {});

    expect(result).toContain("String Title");
    expect(result).toContain("String Summary");
  });

  it("returns no events message for empty results", () => {
    expect(formatEventResults({ events: { results: [] } }, {})).toBe(
      "No events found.",
    );
    expect(formatEventResults({}, {})).toBe("No events found.");
  });

  it("includes pagination footer when multiple pages", () => {
    const data = {
      events: {
        results: [{ title: "Test", uri: "evt-1" }],
        page: 2,
        pages: 10,
        totalResults: 100,
      },
    };

    const result = formatEventResults(data, {});

    expect(result).toContain("1 results (100 total)");
    expect(result).toContain("Page 2 of 10");
    expect(result).toContain("eventsPage: 3");
  });

  it("shows result count on single-page response", () => {
    const data = {
      events: {
        results: [
          { title: "Event A", uri: "evt-1" },
          { title: "Event B", uri: "evt-2" },
        ],
        page: 1,
        pages: 1,
        totalResults: 2,
      },
    };

    const result = formatEventResults(data, {});

    expect(result).toContain("2 results (2 total)");
    expect(result).not.toContain("Page ");
    expect(result).not.toContain("eventsPage:");
  });

  it("renders includeFields extras when present", () => {
    const data = {
      events: {
        results: [
          {
            title: { eng: "Climate Summit" },
            eventDate: "2024-06-01",
            summary: { eng: "Summary text." },
            articleCounts: { total: 50 },
            uri: "evt-100",
            sentiment: -0.3,
            concepts: [
              { label: "Climate change", type: "concept" },
              { label: "United Nations", type: "org" },
            ],
            categories: [{ label: "news/Environment" }],
            images: [
              "https://example.com/img1.jpg",
              "https://example.com/img2.jpg",
            ],
            location: { label: "Geneva", type: "place" },
            socialScore: 8500,
            wgt: 75,
          },
        ],
        page: 1,
        pages: 1,
      },
    };

    const result = formatEventResults(data, {});

    expect(result).toContain("Sentiment: -0.3");
    expect(result).toContain(
      "Concepts: Climate change [concept], United Nations [org]",
    );
    expect(result).toContain("Categories: news/Environment");
    expect(result).toContain(
      "Images: https://example.com/img1.jpg, https://example.com/img2.jpg",
    );
    expect(result).toContain("Location: Geneva");
    expect(result).toContain("Social score: 8500");
    expect(result).toContain("wgt: 75");
  });

  it("does not render extras when fields are absent", () => {
    const data = {
      events: {
        results: [
          {
            title: "Plain Event",
            eventDate: "2024-01-01",
            uri: "evt-plain",
          },
        ],
        page: 1,
        pages: 1,
      },
    };

    const result = formatEventResults(data, {});

    expect(result).not.toContain("Sentiment:");
    expect(result).not.toContain("Concepts:");
    expect(result).not.toContain("Images:");
    expect(result).not.toContain("Social score:");
  });
});

describe("formatArticleDetails", () => {
  it("formats filterTopLevel structure with info wrapper", () => {
    const data = {
      "123456": {
        info: {
          title: "Detail Article",
          dateTimePub: "2024-03-10T08:00:00Z",
          source: { title: "Detail Source" },
          body: "Detailed body content.",
          url: "https://example.com/detail",
        },
      },
    };

    const result = formatArticleDetails(data, {});

    expect(result).toContain("[2024-03-10]");
    expect(result).toContain("Detail Article");
    expect(result).toContain("Detail Source");
    expect(result).toContain("Detailed body content.");
    expect(result).toContain("URL: https://example.com/detail");
  });

  it("handles multiple articles", () => {
    const data = {
      uri1: {
        info: {
          title: "First",
          dateTimePub: "2024-01-01T00:00:00Z",
          source: { title: "Src1" },
          body: "Body 1",
        },
      },
      uri2: {
        info: {
          title: "Second",
          dateTimePub: "2024-01-02T00:00:00Z",
          source: { title: "Src2" },
          body: "Body 2",
        },
      },
    };

    const result = formatArticleDetails(data, {});

    expect(result).toContain("1. [2024-01-01] First");
    expect(result).toContain("2. [2024-01-02] Second");
    expect(result).toContain("---");
  });

  it("falls back when no info wrapper", () => {
    const data = {
      "123": {
        title: "No Info Wrapper",
        dateTimePub: "2024-05-01T00:00:00Z",
        source: { title: "Direct Source" },
        body: "Direct body.",
      },
    };

    const result = formatArticleDetails(data, {});

    expect(result).toContain("No Info Wrapper");
    expect(result).toContain("Direct body.");
  });

  it("returns empty message for empty/null data", () => {
    expect(formatArticleDetails({}, {})).toBe("No article details found.");
    expect(formatArticleDetails(null, {})).toBe("No article details found.");
  });

  it("renders includeFields extras in detail view", () => {
    const data = {
      "art-1": {
        info: {
          title: "Detail with Extras",
          dateTimePub: "2024-03-10T08:00:00Z",
          source: { title: "Src" },
          body: "Body.",
          sentiment: 0.8,
          concepts: [{ label: "AI", type: "concept" }],
          categories: [{ label: "news/Tech" }],
        },
      },
    };

    const result = formatArticleDetails(data, {});

    expect(result).toContain("Sentiment: 0.8");
    expect(result).toContain("Concepts: AI [concept]");
    expect(result).toContain("Categories: news/Tech");
  });
});

describe("formatEventDetails", () => {
  it("formats filterTopLevel structure with info wrapper", () => {
    const data = {
      "evt-789": {
        info: {
          title: { eng: "Major Event Detail" },
          eventDate: "2024-06-15",
          summary: { eng: "Event summary here." },
          articleCounts: { total: 42 },
          uri: "evt-789",
        },
      },
    };

    const result = formatEventDetails(data, {});

    expect(result).toContain("[2024-06-15]");
    expect(result).toContain("Major Event Detail");
    expect(result).toContain("42 articles");
    expect(result).toContain("Event summary here.");
    expect(result).toContain("URI: evt-789");
  });

  it("handles string title and summary", () => {
    const data = {
      "evt-1": {
        info: {
          title: "String Title Event",
          eventDate: "2024-07-01",
          summary: "String summary.",
          uri: "evt-1",
        },
      },
    };

    const result = formatEventDetails(data, {});

    expect(result).toContain("String Title Event");
    expect(result).toContain("String summary.");
  });

  it("falls back when no info wrapper", () => {
    const data = {
      "evt-2": {
        title: "Direct Event",
        eventDate: "2024-08-01",
        summary: "Direct summary.",
        articleCounts: { total: 10 },
        uri: "evt-2",
      },
    };

    const result = formatEventDetails(data, {});

    expect(result).toContain("Direct Event");
    expect(result).toContain("Direct summary.");
  });

  it("returns empty message for empty/null data", () => {
    expect(formatEventDetails({}, {})).toBe("No event details found.");
    expect(formatEventDetails(null, {})).toBe("No event details found.");
  });

  it("renders includeFields extras in detail view", () => {
    const data = {
      "evt-1": {
        info: {
          title: { eng: "Event with Extras" },
          eventDate: "2024-06-15",
          summary: { eng: "Summary." },
          articleCounts: { total: 10 },
          uri: "evt-1",
          sentiment: 0.1,
          concepts: [{ label: "Economy", type: "concept" }],
          images: ["https://example.com/photo.jpg"],
          socialScore: 3200,
        },
      },
    };

    const result = formatEventDetails(data, {});

    expect(result).toContain("Sentiment: 0.1");
    expect(result).toContain("Concepts: Economy [concept]");
    expect(result).toContain("Images: https://example.com/photo.jpg");
    expect(result).toContain("Social score: 3200");
  });
});

describe("formatUsageResults", () => {
  it("formats usage data as key-value pairs", () => {
    const data = {
      usedTokens: 2500,
      availableTokens: 30000,
    };

    const result = formatUsageResults(data, {});

    expect(result).toContain("Tokens used:");
    expect(result).toContain("Tokens available:");
  });

  it("handles missing fields with defaults", () => {
    const result = formatUsageResults({}, {});

    expect(result).toContain("Tokens used:");
    expect(result).toContain("Tokens available:");
  });
});
