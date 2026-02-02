import { describe, it, expect } from "vitest";
import {
  parseFieldGroups,
  getArticleIncludeParams,
  getEventIncludeParams,
  getMentionIncludeParams,
  filterArticle,
  filterEvent,
  filterMention,
  filterResponse,
} from "../src/response-filter.js";

// ---------- parseFieldGroups ----------

describe("parseFieldGroups", () => {
  it("returns empty set for undefined", () => {
    expect(parseFieldGroups(undefined).size).toBe(0);
  });

  it("returns empty set for empty string", () => {
    expect(parseFieldGroups("").size).toBe(0);
  });

  it("parses single group", () => {
    const groups = parseFieldGroups("sentiment");
    expect(groups.has("sentiment")).toBe(true);
    expect(groups.size).toBe(1);
  });

  it("parses multiple groups", () => {
    const groups = parseFieldGroups("sentiment,concepts,images");
    expect(groups.has("sentiment")).toBe(true);
    expect(groups.has("concepts")).toBe(true);
    expect(groups.has("images")).toBe(true);
    expect(groups.size).toBe(3);
  });

  it("trims whitespace", () => {
    const groups = parseFieldGroups(" sentiment , concepts ");
    expect(groups.has("sentiment")).toBe(true);
    expect(groups.has("concepts")).toBe(true);
  });

  it("ignores invalid groups", () => {
    const groups = parseFieldGroups("sentiment,invalid,concepts");
    expect(groups.has("sentiment")).toBe(true);
    expect(groups.has("concepts")).toBe(true);
    expect(groups.has("invalid")).toBe(false);
    expect(groups.size).toBe(2);
  });

  it("is case-insensitive", () => {
    const groups = parseFieldGroups("Sentiment,FULL");
    expect(groups.has("sentiment")).toBe(true);
    expect(groups.has("full")).toBe(true);
  });
});

// ---------- getArticleIncludeParams ----------

describe("getArticleIncludeParams", () => {
  it("returns empty object for no groups", () => {
    expect(getArticleIncludeParams(new Set())).toEqual({});
  });

  it("returns concepts param", () => {
    const params = getArticleIncludeParams(new Set(["concepts"]));
    expect(params.includeArticleConcepts).toBe(true);
    expect(params.includeArticleCategories).toBeUndefined();
  });

  it("returns all params for full", () => {
    const params = getArticleIncludeParams(new Set(["full"]));
    expect(params.includeArticleConcepts).toBe(true);
    expect(params.includeArticleCategories).toBe(true);
    expect(params.includeArticleImage).toBe(true);
    expect(params.includeArticleAuthors).toBe(true);
    expect(params.includeArticleLocation).toBe(true);
    expect(params.includeArticleSocialScore).toBe(true);
    expect(params.includeArticleSentiment).toBe(true);
  });
});

// ---------- getEventIncludeParams ----------

describe("getEventIncludeParams", () => {
  it("always includes summary", () => {
    const params = getEventIncludeParams(new Set());
    expect(params.includeEventSummary).toBe(true);
  });

  it("returns all params for full", () => {
    const params = getEventIncludeParams(new Set(["full"]));
    expect(params.includeEventSummary).toBe(true);
    expect(params.includeEventConcepts).toBe(true);
    expect(params.includeEventCategories).toBe(true);
  });
});

// ---------- getMentionIncludeParams ----------

describe("getMentionIncludeParams", () => {
  it("returns empty object for no groups", () => {
    expect(getMentionIncludeParams(new Set())).toEqual({});
  });

  it("returns location param", () => {
    const params = getMentionIncludeParams(new Set(["location"]));
    expect(params.includeMentionSourceLocation).toBe(true);
  });
});

// ---------- filterArticle ----------

describe("filterArticle", () => {
  const fullArticle = {
    uri: "art-1",
    title: "Test Article",
    body: "Full body text here",
    dateTimePub: "2024-01-01T12:00:00Z",
    url: "https://example.com/article",
    source: {
      title: "Example News",
      uri: "example.com",
      location: { country: "US" },
    },
    date: "2024-01-01",
    time: "12:00:00",
    dateTime: "2024-01-01T12:00:00",
    isDuplicate: false,
    dataType: "news",
    lang: "eng",
    relevance: 5,
    wgt: 100,
    sim: 0.95,
    sentiment: 0.5,
    concepts: [{ uri: "concept-1" }],
    categories: [{ uri: "cat-1" }],
    image: "https://example.com/img.jpg",
    authors: [{ uri: "author-1" }],
    location: { country: "US" },
    shares: { facebook: 100 },
    eventUri: "evt-1",
    storyUri: "story-1",
  };

  it("keeps minimal fields by default", () => {
    const result = filterArticle(fullArticle, new Set());
    expect(result.uri).toBe("art-1");
    expect(result.title).toBe("Test Article");
    expect(result.body).toBe("Full body text here");
    expect(result.dateTimePub).toBe("2024-01-01T12:00:00Z");
    expect(result.url).toBe("https://example.com/article");
    expect(result.source).toEqual({
      title: "Example News",
      uri: "example.com",
    });

    // Stripped fields
    expect(result.date).toBeUndefined();
    expect(result.isDuplicate).toBeUndefined();
    expect(result.sentiment).toBeUndefined();
    expect(result.concepts).toBeUndefined();
    expect(result.eventUri).toBeUndefined();
    expect(result.wgt).toBeUndefined();
  });

  it("includes sentiment when requested", () => {
    const result = filterArticle(fullArticle, new Set(["sentiment"]));
    expect(result.sentiment).toBe(0.5);
    expect(result.concepts).toBeUndefined();
  });

  it("includes multiple groups", () => {
    const result = filterArticle(
      fullArticle,
      new Set(["sentiment", "concepts", "event"]),
    );
    expect(result.sentiment).toBe(0.5);
    expect(result.concepts).toEqual([{ uri: "concept-1" }]);
    expect(result.eventUri).toBe("evt-1");
    expect(result.storyUri).toBe("story-1");
  });

  it("returns full article for full group", () => {
    const result = filterArticle(fullArticle, new Set(["full"]));
    expect(result).toEqual(fullArticle);
  });

  it("includes metadata fields when requested", () => {
    const result = filterArticle(fullArticle, new Set(["metadata"]));
    expect(result.relevance).toBe(5);
    expect(result.wgt).toBe(100);
    expect(result.sim).toBe(0.95);
    expect(result.isDuplicate).toBe(false);
    expect(result.lang).toBe("eng");
    expect(result.date).toBe("2024-01-01");
  });

  it("truncates body with bodyLen", () => {
    const result = filterArticle(fullArticle, new Set(), 4);
    expect(result.body).toBe("Full");
  });

  it("excludes body with bodyLen=0", () => {
    const result = filterArticle(fullArticle, new Set(), 0);
    expect(result.body).toBeUndefined();
  });

  it("keeps full body with bodyLen=-1", () => {
    const result = filterArticle(fullArticle, new Set(), -1);
    expect(result.body).toBe("Full body text here");
  });

  it("preserves full source with location group", () => {
    const result = filterArticle(fullArticle, new Set(["location"]));
    expect(result.source).toEqual(fullArticle.source);
    expect(result.location).toEqual({ country: "US" });
  });
});

// ---------- filterEvent ----------

describe("filterEvent", () => {
  const fullEvent = {
    uri: "evt-1",
    title: { eng: "Test Event" },
    eventDate: "2024-01-01",
    summary: { eng: "Summary text" },
    articleCounts: { total: 100, eng: 80, deu: 20 },
    sentiment: 0.3,
    concepts: [{ uri: "concept-1" }],
    categories: [{ uri: "cat-1" }],
    images: ["https://example.com/img.jpg"],
    location: { country: "US" },
    socialScore: 500,
    wgt: 200,
    relevance: 10,
  };

  it("keeps minimal fields by default", () => {
    const result = filterEvent(fullEvent, new Set());
    expect(result.uri).toBe("evt-1");
    expect(result.title).toEqual({ eng: "Test Event" });
    expect(result.eventDate).toBe("2024-01-01");
    expect(result.summary).toEqual({ eng: "Summary text" });
    expect(result.articleCounts).toEqual({ total: 100 });

    expect(result.sentiment).toBeUndefined();
    expect(result.concepts).toBeUndefined();
    expect(result.socialScore).toBeUndefined();
  });

  it("returns full event for full group", () => {
    const result = filterEvent(fullEvent, new Set(["full"]));
    expect(result).toEqual(fullEvent);
  });

  it("preserves full articleCounts with metadata group", () => {
    const result = filterEvent(fullEvent, new Set(["metadata"]));
    expect(result.articleCounts).toEqual({ total: 100, eng: 80, deu: 20 });
    expect(result.wgt).toBe(200);
  });
});

// ---------- filterMention ----------

describe("filterMention", () => {
  const fullMention = {
    uri: "mention-1",
    sentence: "Company X laid off 500 employees.",
    date: "2024-01-01",
    source: {
      title: "Example News",
      uri: "example.com",
      location: { country: "US" },
    },
    time: "12:00:00",
    lang: "eng",
    eventTypeUri: "et/layoff",
    sentiment: -0.5,
    factLevel: "fact",
    articleUri: "art-1",
    articleUrl: "https://example.com/article",
    sentenceIdx: 3,
  };

  it("keeps minimal fields by default", () => {
    const result = filterMention(fullMention, new Set());
    expect(result.uri).toBe("mention-1");
    expect(result.sentence).toBe("Company X laid off 500 employees.");
    expect(result.date).toBe("2024-01-01");
    expect(result.source).toEqual({
      title: "Example News",
      uri: "example.com",
    });

    expect(result.time).toBeUndefined();
    expect(result.lang).toBeUndefined();
    expect(result.sentiment).toBeUndefined();
    expect(result.articleUri).toBeUndefined();
  });

  it("returns full mention for full group", () => {
    const result = filterMention(fullMention, new Set(["full"]));
    expect(result).toEqual(fullMention);
  });

  it("includes metadata fields", () => {
    const result = filterMention(fullMention, new Set(["metadata"]));
    expect(result.time).toBe("12:00:00");
    expect(result.lang).toBe("eng");
    expect(result.articleUri).toBe("art-1");
  });
});

// ---------- filterResponse ----------

describe("filterResponse", () => {
  it("returns null/undefined as-is", () => {
    expect(
      filterResponse(null, { resultType: "articles", groups: new Set() }),
    ).toBeNull();
    expect(
      filterResponse(undefined, { resultType: "articles", groups: new Set() }),
    ).toBeUndefined();
  });

  it("filters articles in standard wrapper", () => {
    const response = {
      articles: {
        results: [
          {
            uri: "art-1",
            title: "Test",
            body: "Body",
            dateTimePub: "2024-01-01",
            url: "https://example.com",
            source: { title: "News" },
            sentiment: 0.5,
            wgt: 100,
          },
        ],
        totalResults: 1,
        page: 1,
        count: 1,
        pages: 1,
      },
    };

    const result = filterResponse(response, {
      resultType: "articles",
      groups: new Set(),
    }) as Record<string, unknown>;

    const articles = result.articles as Record<string, unknown>;
    const results = articles.results as Record<string, unknown>[];
    expect(results[0].uri).toBe("art-1");
    expect(results[0].title).toBe("Test");
    expect(results[0].sentiment).toBeUndefined();
    expect(results[0].wgt).toBeUndefined();

    // Pagination preserved
    expect(articles.totalResults).toBe(1);
    expect(articles.page).toBe(1);
  });

  it("bypasses filtering with full group", () => {
    const response = { articles: { results: [{ everything: "here" }] } };
    const result = filterResponse(response, {
      resultType: "articles",
      groups: new Set(["full"]),
    });
    expect(result).toEqual(response);
  });

  it("still applies bodyLen even with full group", () => {
    const response = {
      articles: {
        results: [
          {
            uri: "art-1",
            title: "Test",
            body: "A very long body text",
            sentiment: 0.5,
          },
        ],
      },
    };
    const result = filterResponse(response, {
      resultType: "articles",
      groups: new Set(["full"]),
      bodyLen: 6,
    }) as Record<string, unknown>;

    const articles = result.articles as Record<string, unknown>;
    const results = articles.results as Record<string, unknown>[];
    expect(results[0].body).toBe("A very");
    // full group: other fields preserved
    expect(results[0].sentiment).toBe(0.5);
  });

  it("filters events in standard wrapper", () => {
    const response = {
      events: {
        results: [
          {
            uri: "evt-1",
            title: { eng: "Event" },
            eventDate: "2024-01-01",
            summary: { eng: "Summary" },
            articleCounts: { total: 50, eng: 30 },
            socialScore: 100,
          },
        ],
        totalResults: 1,
      },
    };

    const result = filterResponse(response, {
      resultType: "events",
      groups: new Set(),
    }) as Record<string, unknown>;

    const events = result.events as Record<string, unknown>;
    const results = events.results as Record<string, unknown>[];
    expect(results[0].uri).toBe("evt-1");
    expect(results[0].socialScore).toBeUndefined();
    expect(results[0].articleCounts).toEqual({ total: 50 });
  });

  it("filters mentions in standard wrapper", () => {
    const response = {
      mentions: {
        results: [
          {
            uri: "m-1",
            sentence: "Test sentence",
            date: "2024-01-01",
            source: { title: "News" },
            lang: "eng",
            sentiment: -0.2,
          },
        ],
      },
    };

    const result = filterResponse(response, {
      resultType: "mentions",
      groups: new Set(),
    }) as Record<string, unknown>;

    const mentions = result.mentions as Record<string, unknown>;
    const results = mentions.results as Record<string, unknown>[];
    expect(results[0].uri).toBe("m-1");
    expect(results[0].sentence).toBe("Test sentence");
    expect(results[0].lang).toBeUndefined();
    expect(results[0].sentiment).toBeUndefined();
  });
});
