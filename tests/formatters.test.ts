import { describe, it, expect } from "vitest";
import {
  formatSuggestLocations,
  formatSuggestConcepts,
  formatSuggestSources,
  formatSuggestCategories,
  formatSuggestAuthors,
  formatArticleResults,
  formatEventResults,
  formatUsageResults,
} from "../src/formatters.js";

describe("formatSuggestLocations", () => {
  it("formats location with country as JSONL", () => {
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
    const parsed = JSON.parse(result);

    expect(parsed).toEqual({
      label: "Ljubljana",
      type: "place",
      uri: "http://en.wikipedia.org/wiki/Ljubljana",
      country: "Slovenia",
    });
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
    const parsed = JSON.parse(result);

    expect(parsed).toEqual({
      label: "Slovenia",
      type: "country",
      uri: "http://en.wikipedia.org/wiki/Slovenia",
    });
    expect(parsed.country).toBeUndefined();
  });
});

describe("formatSuggestConcepts", () => {
  it("formats concept as JSONL", () => {
    const data = [
      {
        label: "Donald Trump",
        type: "person",
        uri: "http://en.wikipedia.org/wiki/Donald_Trump",
        score: 26939520,
      },
    ];

    const result = formatSuggestConcepts(data, {});
    const parsed = JSON.parse(result);

    expect(parsed).toEqual({
      label: "Donald Trump",
      type: "person",
      uri: "http://en.wikipedia.org/wiki/Donald_Trump",
    });
  });

  it("returns no results message for empty array", () => {
    expect(formatSuggestConcepts([], {})).toBe("No results found.");
  });

  it("formats multiple concepts as JSONL lines", () => {
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
    const lines = result.split("\n");

    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0])).toEqual({
      label: "Apple Inc.",
      type: "org",
      uri: "http://en.wikipedia.org/wiki/Apple_Inc.",
    });
    expect(JSON.parse(lines[1])).toEqual({
      label: "Apple",
      type: "wiki",
      uri: "http://en.wikipedia.org/wiki/Apple",
    });
  });
});

describe("formatSuggestSources", () => {
  it("formats source as JSONL", () => {
    const data = [
      {
        title: "MMC RTV Slovenija",
        uri: "rtvslo.si",
        dataType: "news",
        score: 226385,
      },
    ];

    const result = formatSuggestSources(data, {});
    const parsed = JSON.parse(result);

    expect(parsed).toEqual({
      label: "MMC RTV Slovenija",
      type: "news",
      uri: "rtvslo.si",
    });
  });

  it("returns no results message for empty array", () => {
    expect(formatSuggestSources([], {})).toBe("No results found.");
  });

  it("handles missing title gracefully", () => {
    const data = [{ uri: "example.com", dataType: "blog", score: 100 }];

    const result = formatSuggestSources(data, {});
    const parsed = JSON.parse(result);

    expect(parsed.label).toBe("Unknown");
    expect(parsed.type).toBe("blog");
  });
});

describe("formatSuggestCategories", () => {
  it("formats category with parent as JSONL", () => {
    const data = [
      {
        label: "news/Technology",
        uri: "news/Technology",
        parentUri: "news",
      },
    ];

    const result = formatSuggestCategories(data, {});
    const parsed = JSON.parse(result);

    expect(parsed).toEqual({
      label: "news/Technology",
      uri: "news/Technology",
      parent: "news",
    });
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
    const parsed = JSON.parse(result);

    expect(parsed).toEqual({
      label: "news",
      uri: "news",
    });
    expect(parsed.parent).toBeUndefined();
  });
});

describe("formatSuggestAuthors", () => {
  it("formats author as JSONL", () => {
    const data = [
      {
        name: "John Smith",
        type: "author",
        uri: "john_smith@express.co.uk",
      },
    ];

    const result = formatSuggestAuthors(data, {});
    const parsed = JSON.parse(result);

    expect(parsed).toEqual({
      label: "John Smith",
      type: "author",
      uri: "john_smith@express.co.uk",
    });
  });

  it("returns no results message for empty array", () => {
    expect(formatSuggestAuthors([], {})).toBe("No results found.");
  });

  it("handles missing name gracefully", () => {
    const data = [{ uri: "test@example.com", type: "author" }];

    const result = formatSuggestAuthors(data, {});
    const parsed = JSON.parse(result);

    expect(parsed.label).toBe("Unknown");
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
