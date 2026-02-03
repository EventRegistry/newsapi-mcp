import { describe, it, expect } from "vitest";
import {
  formatSuggestResults,
  formatArticleResults,
  formatEventResults,
  formatUsageResults,
} from "../src/formatters.js";

describe("formatSuggestResults", () => {
  it("formats suggest results as numbered list", () => {
    const data = [
      { label: "Apple Inc.", uri: "http://en.wikipedia.org/wiki/Apple_Inc." },
      { label: "Apple", uri: "http://en.wikipedia.org/wiki/Apple" },
    ];

    const result = formatSuggestResults(data, {});

    expect(result).toBe(
      "1. Apple Inc. -> http://en.wikipedia.org/wiki/Apple_Inc.\n" +
        "2. Apple -> http://en.wikipedia.org/wiki/Apple",
    );
  });

  it("returns no results message for empty array", () => {
    expect(formatSuggestResults([], {})).toBe("No results found.");
  });

  it("returns no results message for non-array", () => {
    expect(formatSuggestResults(null, {})).toBe("No results found.");
    expect(formatSuggestResults(undefined, {})).toBe("No results found.");
  });

  it("handles items with title or name instead of label", () => {
    const data = [
      { title: "New York Times", uri: "nytimes.com" },
      { name: "BBC News", uri: "bbc.com" },
    ];

    const result = formatSuggestResults(data, {});

    expect(result).toContain("New York Times");
    expect(result).toContain("BBC News");
  });

  it("handles missing uri gracefully", () => {
    const data = [{ label: "Test" }];
    const result = formatSuggestResults(data, {});
    expect(result).toBe("1. Test -> ");
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
      },
    };

    const result = formatArticleResults(data, {});

    expect(result).toContain("Page 1 of 5");
    expect(result).toContain("articlesPage: 2");
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
      },
    };

    const result = formatEventResults(data, {});

    expect(result).toContain("Page 2 of 10");
    expect(result).toContain("eventsPage: 3");
  });
});

describe("formatUsageResults", () => {
  it("formats usage data as key-value pairs", () => {
    const data = {
      planName: "Pro",
      dailyUsed: 100,
      dailyAvailable: 1000,
      monthlyUsed: 2500,
      monthlyAvailable: 30000,
    };

    const result = formatUsageResults(data, {});

    expect(result).toBe(
      "Plan: Pro\n" + "Daily: 100 / 1000\n" + "Monthly: 2500 / 30000",
    );
  });

  it("handles missing fields with defaults", () => {
    const result = formatUsageResults({}, {});

    expect(result).toBe("Plan: Unknown\nDaily: 0 / 0\nMonthly: 0 / 0");
  });
});
