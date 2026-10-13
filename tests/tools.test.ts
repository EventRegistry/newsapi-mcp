import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the client module before importing tools
vi.mock("../src/client.js", () => ({
  apiPost: vi.fn().mockResolvedValue({ data: { mocked: true } }),
  parseArray: vi.fn((v: unknown) => {
    if (v === undefined || v === null) return undefined;
    if (Array.isArray(v)) return v.map(String);
    const s = String(v).trim();
    if (s.startsWith("[")) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed.map(String);
        return [String(parsed)];
      } catch {
        // fall through
      }
    }
    if (/https?:\/\//.test(s)) {
      return s.split(/,(?=\s*https?:\/\/)/).map((x: string) => x.trim());
    }
    return s.split(",").map((x: string) => x.trim());
  }),
  initClient: vi.fn(),
}));

import { apiPost } from "../src/client.js";
import { search } from "../src/tools/search.js";
import { getArticleDetails, buildFilterBody } from "../src/tools/articles.js";
import { ApiError } from "../src/types.js";
import { getEventDetails, getBreakingEvents } from "../src/tools/events.js";
import {
  getTopicPageArticles,
  getTopicPageEvents,
} from "../src/tools/topic-pages.js";
import { suggest } from "../src/tools/suggest.js";
import { getApiUsage } from "../src/tools/usage.js";

const mockedApiPost = vi.mocked(apiPost);

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------- Articles ----------

describe("search articles", () => {
  it("calls correct endpoint with resultType, articleBodyLen, and default count", async () => {
    await search.handler({ kind: "articles", keyword: "Tesla" });

    expect(mockedApiPost).toHaveBeenCalledWith(
      "/article/getArticles",
      expect.objectContaining({
        resultType: "articles",
        articleBodyLen: 1000,
        articlesCount: 50,
        keyword: ["Tesla"],
      }),
    );
  });

  const page = (pubs: string[]) => ({
    data: {
      articles: {
        results: pubs.map((dateTimePub, i) => ({ uri: `u${i}`, dateTimePub })),
      },
    },
  });
  const uris = (data: unknown) =>
    (data as { articles: { results: { uri: string }[] } }).articles.results.map(
      (a) => a.uri,
    );

  it("orders a date-sorted page by publish time, newest first", async () => {
    mockedApiPost.mockResolvedValueOnce(
      page(["2026-10-09T12:35Z", "2026-10-09T12:31Z", "2026-10-09T12:40Z"]),
    );
    const { data } = await search.handler({ kind: "articles", keyword: "x" });
    expect(uris(data)).toEqual(["u2", "u0", "u1"]);
  });

  it("orders a date-sorted page oldest first when sortByAsc is set", async () => {
    mockedApiPost.mockResolvedValueOnce(
      page(["2026-10-09T12:35Z", "2026-10-09T12:31Z"]),
    );
    const { data } = await search.handler({
      kind: "articles",
      keyword: "x",
      options: { sortByAsc: true },
    });
    expect(uris(data)).toEqual(["u1", "u0"]);
  });

  it("keeps the API order for a relevance sort", async () => {
    mockedApiPost.mockResolvedValueOnce(
      page(["2026-10-09T12:31Z", "2026-10-09T12:35Z"]),
    );
    const { data } = await search.handler({
      kind: "articles",
      keyword: "x",
      sortBy: "rel",
    });
    expect(uris(data)).toEqual(["u0", "u1"]);
  });

  it("passes includeFields as API include params", async () => {
    await search.handler({
      kind: "articles",
      keyword: "Tesla",
      includeFields: "concepts,sentiment",
    });

    const body = mockedApiPost.mock.calls[0][1];
    expect(body.includeArticleConcepts).toBe(true);
    expect(body.includeArticleSentiment).toBe(true);
    expect(body.includeFields).toBeUndefined();
  });

  it("expands dataType array field", async () => {
    await search.handler({ kind: "articles", dataType: "news,pr" });

    const body = mockedApiPost.mock.calls[0][1];
    expect(body.dataType).toEqual(["news", "pr"]);
  });

  it("passes pagination params through", async () => {
    await search.handler({ kind: "articles", page: 2, count: 50 });

    const body = mockedApiPost.mock.calls[0][1];
    expect(body.articlesPage).toBe(2);
    expect(body.articlesCount).toBe(50);
  });

  it("passes dateMentionStart/dateMentionEnd through as strings", async () => {
    await search.handler({
      kind: "articles",
      keyword: "election",
      dateMentionStart: "2025-06-01",
      dateMentionEnd: "2025-06-30",
    });
    const body = mockedApiPost.mock.calls[0][1];
    expect(body.dateMentionStart).toBe("2025-06-01");
    expect(body.dateMentionEnd).toBe("2025-06-30");
  });
});

describe("getArticleDetails", () => {
  it("calls correct endpoint with parsed URIs", async () => {
    await getArticleDetails.handler({ articleUri: "uri1,uri2" });

    expect(mockedApiPost).toHaveBeenCalledWith(
      "/article/getArticle",
      expect.objectContaining({
        articleUri: ["uri1", "uri2"],
        articleBodyLen: -1,
      }),
    );
  });

  it("accepts array input for articleUri", async () => {
    await getArticleDetails.handler({ articleUri: ["uri1", "uri2"] });

    expect(mockedApiPost).toHaveBeenCalledWith(
      "/article/getArticle",
      expect.objectContaining({
        articleUri: ["uri1", "uri2"],
        articleBodyLen: -1,
      }),
    );
  });
});

// ---------- Events ----------

describe("search events", () => {
  it("calls correct endpoint with resultType, includeEventSummary, and default count", async () => {
    await search.handler({ kind: "events", keyword: "earthquake" });

    expect(mockedApiPost).toHaveBeenCalledWith(
      "/event/getEvents",
      expect.objectContaining({
        resultType: "events",
        eventsCount: 50,
        keyword: ["earthquake"],
        includeEventSummary: true,
      }),
    );
  });

  it("passes event-specific params through", async () => {
    await search.handler({
      kind: "events",
      minArticlesInEvent: 10,
      reportingDateStart: "2024-01-01",
    });

    const body = mockedApiPost.mock.calls[0][1];
    expect(body.minArticlesInEvent).toBe(10);
    expect(body.reportingDateStart).toBe("2024-01-01");
  });

  it("renames minSentiment/maxSentiment to event-specific param names", async () => {
    await search.handler({
      kind: "events",
      keyword: "earthquake",
      minSentiment: -0.5,
      maxSentiment: 0.8,
    });

    const body = mockedApiPost.mock.calls[0][1];
    expect(body.minSentimentEvent).toBe(-0.5);
    expect(body.maxSentimentEvent).toBe(0.8);
    expect(body.minSentiment).toBeUndefined();
    expect(body.maxSentiment).toBeUndefined();
  });

  it("rejects the article-only source rank params", async () => {
    await expect(
      search.handler({
        kind: "events",
        keyword: "earthquake",
        startSourceRankPercentile: 0,
      }),
    ).rejects.toThrow(/startSourceRankPercentile.*applies to kind/);
    expect(mockedApiPost).not.toHaveBeenCalled();
  });
});

describe("getEventDetails", () => {
  it("calls correct endpoint with parsed URIs and includeEventSummary", async () => {
    await getEventDetails.handler({ eventUri: "evt-123,evt-456" });

    expect(mockedApiPost).toHaveBeenCalledWith(
      "/event/getEvent",
      expect.objectContaining({
        eventUri: ["evt-123", "evt-456"],
        includeEventSummary: true,
      }),
    );
  });

  it("accepts array input for eventUri", async () => {
    await getEventDetails.handler({ eventUri: ["evt-1", "evt-2"] });

    expect(mockedApiPost).toHaveBeenCalledWith(
      "/event/getEvent",
      expect.objectContaining({
        eventUri: ["evt-1", "evt-2"],
        includeEventSummary: true,
      }),
    );
  });

  it("sends resultType info by default with array eventUri", async () => {
    await getEventDetails.handler({ eventUri: "evt-1,evt-2" });

    const body = mockedApiPost.mock.calls[0][1];
    expect(body.resultType).toBe("info");
    expect(body.eventUri).toEqual(["evt-1", "evt-2"]);
  });

  it("sends resultType articles with single string eventUri", async () => {
    await getEventDetails.handler({
      eventUri: "evt-123",
      resultType: "articles",
    });

    const body = mockedApiPost.mock.calls[0][1];
    expect(body.resultType).toBe("articles");
    expect(body.eventUri).toBe("evt-123");
  });

  it("defaults the article page to 10 compact rows and forwards overrides", async () => {
    await getEventDetails.handler({
      eventUri: "evt-123",
      resultType: "articles",
    });
    let body = mockedApiPost.mock.calls[0][1];
    expect(body.articlesCount).toBe(10);
    expect(body.articlesPage).toBe(1);
    expect(body.articlesSortBy).toBe("date");
    expect(body.articlesArticleBodyLen).toBe(0);

    await getEventDetails.handler({
      eventUri: "evt-123",
      resultType: "articles",
      articlesCount: 25,
      articlesPage: 2,
      articlesSortBy: "rel",
      articlesArticleBodyLen: -1,
    });
    body = mockedApiPost.mock.calls[1][1];
    expect(body.articlesCount).toBe(25);
    expect(body.articlesPage).toBe(2);
    expect(body.articlesSortBy).toBe("rel");
    expect(body.articlesArticleBodyLen).toBe(-1);
  });

  it("strips article fields the caller did not ask for", async () => {
    mockedApiPost.mockResolvedValueOnce({
      data: {
        "evt-1": {
          articles: {
            results: [
              {
                uri: "a1",
                title: "T",
                url: "https://ex.com/a",
                source: { title: "Ex" },
                dateTimePub: "2025-01-01T00:00:00Z",
                wgt: 1,
                sim: 0.5,
                image: "https://ex.com/i.jpg",
                authors: [{ name: "A" }],
              },
            ],
            totalResults: 1,
          },
        },
      },
    });
    const result = await getEventDetails.handler({
      eventUri: "evt-1",
      resultType: "articles",
    });
    const entry = (result.data as Record<string, Record<string, unknown>>)[
      "evt-1"
    ];
    const [art] = (entry.articles as { results: Record<string, unknown>[] })
      .results;
    expect(art.url).toBe("https://ex.com/a");
    expect(art.title).toBe("T");
    expect(art.wgt).toBeUndefined();
    expect(art.image).toBeUndefined();
    expect(art.authors).toBeUndefined();
  });

  it("sends no article params for resultType info", async () => {
    await getEventDetails.handler({ eventUri: "evt-1", articlesCount: 5 });
    const body = mockedApiPost.mock.calls[0][1];
    expect(body.articlesCount).toBeUndefined();
  });

  it("throws error for resultType articles with multiple URIs", async () => {
    await expect(
      getEventDetails.handler({
        eventUri: ["evt-1", "evt-2"],
        resultType: "articles",
      }),
    ).rejects.toThrow(/only supports a single eventUri/);
  });

  it("sends resultType info with array URIs (existing behavior)", async () => {
    await getEventDetails.handler({
      eventUri: ["evt-1", "evt-2"],
      resultType: "info",
    });

    const body = mockedApiPost.mock.calls[0][1];
    expect(body.resultType).toBe("info");
    expect(body.eventUri).toEqual(["evt-1", "evt-2"]);
  });
});

// ---------- Ignore / Negative Filters ----------

describe("ignore params", () => {
  it("articles expands ignore* params as arrays", async () => {
    await search.handler({
      kind: "articles",
      keyword: "AI",
      ignoreConceptUri: "uri1,uri2",
      ignoreSourceUri: "src1",
      ignoreLang: "deu,fra",
    });

    const body = mockedApiPost.mock.calls[0][1];
    expect(body.ignoreConceptUri).toEqual(["uri1", "uri2"]);
    expect(body.ignoreSourceUri).toEqual(["src1"]);
    expect(body.ignoreLang).toEqual(["deu", "fra"]);
  });

  it("events expands ignore* params as arrays", async () => {
    await search.handler({
      kind: "events",
      keyword: "earthquake",
      ignoreKeyword: "tsunami,flood",
      ignoreCategoryUri: "cat1",
    });

    const body = mockedApiPost.mock.calls[0][1];
    expect(body.ignoreKeyword).toEqual(["tsunami", "flood"]);
    expect(body.ignoreCategoryUri).toEqual(["cat1"]);
  });

  it("passes ignoreKeywordLoc as scalar string", async () => {
    await search.handler({
      kind: "articles",
      keyword: "AI",
      ignoreKeyword: "spam",
      ignoreKeywordLoc: "title",
    });
    const body = mockedApiPost.mock.calls[0][1];
    expect(body.ignoreKeywordLoc).toBe("title");
  });

  it("articles passes sourceGroupUri and operator params", async () => {
    await search.handler({
      kind: "articles",
      keyword: "AI",
      sourceGroupUri: "group1,group2",
      conceptOper: "or",
      categoryOper: "and",
    });

    const body = mockedApiPost.mock.calls[0][1];
    expect(body.sourceGroupUri).toEqual(["group1", "group2"]);
    expect(body.conceptOper).toBe("or");
    expect(body.categoryOper).toBe("and");
  });
});

describe("search events operators and sourceGroupUri", () => {
  it("passes operator and sourceGroupUri params through", async () => {
    await search.handler({
      kind: "events",
      keyword: "earthquake",
      sourceGroupUri: "group1",
      conceptOper: "or",
      categoryOper: "and",
    });
    const body = mockedApiPost.mock.calls[0][1];
    expect(body.sourceGroupUri).toEqual(["group1"]);
    expect(body.conceptOper).toBe("or");
    expect(body.categoryOper).toBe("and");
  });
});

// ---------- Topic Pages ----------

describe("getTopicPageArticles", () => {
  it("calls correct endpoint with uri, resultType, and default count", async () => {
    await getTopicPageArticles.handler({ uri: "topic-123" });

    expect(mockedApiPost).toHaveBeenCalledWith(
      "/article/getArticlesForTopicPage",
      expect.objectContaining({
        uri: "topic-123",
        resultType: "articles",
        articleBodyLen: 1000,
        articlesCount: 100,
      }),
    );
  });

  it("includes optional pagination params when provided", async () => {
    await getTopicPageArticles.handler({
      uri: "topic-123",
      articlesPage: 2,
      articlesCount: 50,
      articlesSortBy: "rel",
    });

    const body = mockedApiPost.mock.calls[0][1];
    expect(body.articlesPage).toBe(2);
    expect(body.articlesCount).toBe(50);
    expect(body.articlesSortBy).toBe("rel");
  });
});

describe("getTopicPageEvents", () => {
  it("calls correct endpoint with uri, resultType, includeEventSummary, and default count", async () => {
    await getTopicPageEvents.handler({ uri: "topic-456" });

    expect(mockedApiPost).toHaveBeenCalledWith(
      "/event/getEventsForTopicPage",
      expect.objectContaining({
        uri: "topic-456",
        resultType: "events",
        eventsCount: 50,
        includeEventSummary: true,
      }),
    );
  });

  it("includes optional pagination params when provided", async () => {
    await getTopicPageEvents.handler({
      uri: "topic-456",
      eventsPage: 3,
      eventsCount: 25,
      eventsSortBy: "size",
    });

    const body = mockedApiPost.mock.calls[0][1];
    expect(body.eventsPage).toBe(3);
    expect(body.eventsCount).toBe(25);
    expect(body.eventsSortBy).toBe("size");
  });
});

// ---------- Default Values ----------

describe("default values", () => {
  it("articles sends articlesCount: 50 and articleBodyLen: 1000 by default", async () => {
    await search.handler({ kind: "articles", keyword: "AI" });

    const body = mockedApiPost.mock.calls[0][1];
    expect(body.articlesCount).toBe(50);
    expect(body.articleBodyLen).toBe(1000);
  });

  it("events sends eventsCount: 50 by default", async () => {
    await search.handler({ kind: "events", keyword: "earthquake" });

    const body = mockedApiPost.mock.calls[0][1];
    expect(body.eventsCount).toBe(50);
  });

  it("explicit params override defaults", async () => {
    await search.handler({
      kind: "articles",
      keyword: "AI",
      count: 10,
      articleBodyLen: 200,
    });

    const body = mockedApiPost.mock.calls[0][1];
    expect(body.articlesCount).toBe(10);
    expect(body.articleBodyLen).toBe(200);
  });
});

// ---------- Suggest ----------

describe("suggest", () => {
  const expectedPaths: Record<string, string> = {
    concepts: "/suggestConceptsFast",
    categories: "/suggestCategoriesFast",
    sources: "/suggestSourcesFast",
    locations: "/suggestLocationsFast",
    authors: "/suggestAuthorsFast",
  };

  it("requires type and prefix params", () => {
    expect(suggest.inputSchema.required).toEqual(["type", "prefix"]);
  });

  for (const [type, path] of Object.entries(expectedPaths)) {
    it(`type="${type}" calls apiPost with ${path}`, async () => {
      await suggest.handler({ type, prefix: "Test" });

      expect(mockedApiPost).toHaveBeenCalledWith(path, {
        prefix: "Test",
        lang: "eng",
      });
    });
  }

  it('type="eventTypes" calls the event type endpoint with the prefix only', async () => {
    await suggest.handler({
      type: "eventTypes",
      prefix: "layoff",
      lang: "deu",
    });

    expect(mockedApiPost).toHaveBeenCalledWith("/eventType/suggestEventTypes", {
      prefix: "layoff",
    });
  });

  it("passes custom lang parameter", async () => {
    await suggest.handler({ type: "concepts", prefix: "Test", lang: "deu" });

    expect(mockedApiPost).toHaveBeenCalledWith("/suggestConceptsFast", {
      prefix: "Test",
      lang: "deu",
    });
  });

  it("calls the API on every call", async () => {
    await suggest.handler({ type: "concepts", prefix: "Tesla" });
    await suggest.handler({ type: "concepts", prefix: "Tesla" });
    expect(mockedApiPost).toHaveBeenCalledTimes(2);
  });
});

// ---------- Usage ----------

describe("getApiUsage", () => {
  it("calls apiPost with /usage and empty body", async () => {
    await getApiUsage.handler({});

    expect(mockedApiPost).toHaveBeenCalledWith("/usage", {});
  });

  it("returns apiPost result as data", async () => {
    mockedApiPost.mockResolvedValueOnce({
      data: { usedTokens: 100, remainingTokens: 9900 },
      tokenUsage: undefined,
    });

    const result = await getApiUsage.handler({});
    expect(result.data).toEqual({ usedTokens: 100, remainingTokens: 9900 });
  });
});

// ---------- buildFilterBody ----------

describe("buildFilterBody", () => {
  it("parses string query as JSON", () => {
    const body = buildFilterBody({ query: '{"$query":{"keyword":"AI"}}' });
    expect(body.query).toEqual({
      $query: { keyword: "AI" },
      $filter: { forceMaxDataTimeWindow: "31" },
    });
  });

  it("passes object query through directly", () => {
    const queryObj = { $query: { keyword: "AI", dateStart: "2025-01-01" } };
    const body = buildFilterBody({ query: queryObj });
    expect(body.query).toEqual(queryObj);
  });

  it("throws ApiError on invalid JSON string query", () => {
    expect(() => buildFilterBody({ query: "{not valid json" })).toThrow(
      ApiError,
    );
    expect(() => buildFilterBody({ query: "{not valid json" })).toThrow(
      /Invalid JSON/,
    );
  });

  it("strips local params (includeFields, articleBodyLen)", () => {
    const body = buildFilterBody({
      keyword: "test",
      includeFields: "sentiment",
      articleBodyLen: 200,
    });
    expect(body.includeFields).toBeUndefined();
    expect(body.articleBodyLen).toBeUndefined();
    expect(body.keyword).toBeDefined();
  });
});

// ---------- Aggregates ----------

describe("aggregate resultType", () => {
  it("articles send filters and resultType only, returns data unfiltered", async () => {
    const aggregate = {
      timeAggr: { results: [{ date: "2025-01-01", count: 3 }] },
    };
    mockedApiPost.mockResolvedValueOnce({ data: aggregate });

    const result = await search.handler({
      kind: "articles",
      keyword: "Tesla",
      dateStart: "2025-01-01",
      resultType: "timeAggr",
      count: 10,
      page: 2,
      sortBy: "rel",
      includeFields: "concepts",
      articleBodyLen: 0,
    });

    const [path, body] = mockedApiPost.mock.calls[0];
    expect(path).toBe("/article/getArticles");
    expect(body).toEqual({
      keyword: ["Tesla"],
      dateStart: "2025-01-01",
      resultType: "timeAggr",
    });
    expect(result.data).toBe(aggregate);
  });

  it("events send filters and resultType only, with event param names", async () => {
    await search.handler({
      kind: "events",
      keyword: "earthquake",
      dateStart: "2025-01-01",
      minSentiment: -0.5,
      resultType: "sourceAggr",
      count: 10,
      page: 2,
      sortBy: "size",
      includeFields: "concepts",
    });

    const [path, body] = mockedApiPost.mock.calls[0];
    expect(path).toBe("/event/getEvents");
    expect(body).toEqual({
      keyword: ["earthquake"],
      dateStart: "2025-01-01",
      minSentimentEvent: -0.5,
      resultType: "sourceAggr",
    });
  });

  it("the default resultType keeps the list request unchanged", async () => {
    await search.handler({
      kind: "articles",
      keyword: "Tesla",
      resultType: "articles",
    });

    const body = mockedApiPost.mock.calls[0][1];
    expect(body.resultType).toBe("articles");
    expect(body.articlesCount).toBe(50);
    expect(body.articleBodyLen).toBe(1000);
  });
});

// ---------- Breaking events ----------

describe("getBreakingEvents", () => {
  it("calls the endpoint with defaults and event include params", async () => {
    await getBreakingEvents.handler({});

    expect(mockedApiPost).toHaveBeenCalledWith("/event/getBreakingEvents", {
      breakingEventsCount: 50,
      breakingEventsPage: 1,
      breakingEventsMinBreakingScore: 0.2,
      includeEventSummary: true,
      includeEventArticleCounts: true,
    });
  });

  it("passes count, page, score and includeFields through", async () => {
    await getBreakingEvents.handler({
      breakingEventsCount: 10,
      breakingEventsPage: 3,
      breakingEventsMinBreakingScore: 0.5,
      includeFields: "concepts",
    });

    const body = mockedApiPost.mock.calls[0][1];
    expect(body.breakingEventsCount).toBe(10);
    expect(body.breakingEventsPage).toBe(3);
    expect(body.breakingEventsMinBreakingScore).toBe(0.5);
    expect(body.includeEventConcepts).toBe(true);
    expect(body.includeFields).toBeUndefined();
  });

  it("filters the breakingEvents wrapper and keeps the breaking score", async () => {
    mockedApiPost.mockResolvedValueOnce({
      data: {
        breakingEvents: {
          results: [
            {
              uri: "eng-1",
              title: { eng: "Quake" },
              eventDate: "2025-01-01",
              summary: { eng: "S" },
              totalArticleCount: 40,
              breakingScore: 0.8,
              socialScore: 5,
            },
          ],
          totalResults: 1,
        },
      },
    });

    const result = await getBreakingEvents.handler({});

    const wrapper = (result.data as Record<string, unknown>)
      .breakingEvents as Record<string, unknown>;
    const [evt] = wrapper.results as Record<string, unknown>[];
    expect(evt.breakingScore).toBe(0.8);
    expect(evt.title).toBe("Quake");
    expect(evt.socialScore).toBeUndefined();
    expect(wrapper.totalResults).toBe(1);
  });

  it("attaches the newest article per event and sums the token cost", async () => {
    mockedApiPost.mockResolvedValueOnce({
      data: {
        breakingEvents: {
          results: [
            { uri: "eng-1", title: { eng: "Quake" }, breakingScore: 0.8 },
            { uri: "eng-2", title: { eng: "Flood" }, breakingScore: 0.5 },
          ],
        },
      },
      tokenUsage: { reqTokens: 1, remaining: 900 },
    });
    mockedApiPost.mockResolvedValueOnce({
      data: {
        "eng-1": {
          articles: {
            results: [
              {
                title: "Quake hits coast",
                url: "https://ex.com/quake",
                source: { title: "Reuters" },
              },
            ],
          },
        },
      },
      tokenUsage: { reqTokens: 5, remaining: 895 },
    });
    mockedApiPost.mockResolvedValueOnce({
      data: { "eng-2": { articles: { results: [] } } },
      tokenUsage: { reqTokens: 5, remaining: 890 },
    });

    const result = await getBreakingEvents.handler({
      includeTopArticleUrl: true,
    });

    expect(mockedApiPost).toHaveBeenCalledTimes(3);
    expect(mockedApiPost.mock.calls[1][0]).toBe("/event/getEvent");
    expect(mockedApiPost.mock.calls[1][1]).toMatchObject({
      eventUri: "eng-1",
      resultType: "articles",
      articlesCount: 1,
      articlesArticleBodyLen: 0,
    });
    const [first, second] = (
      (result.data as Record<string, unknown>).breakingEvents as {
        results: Record<string, unknown>[];
      }
    ).results;
    expect(first.topArticle).toEqual({
      title: "Quake hits coast",
      url: "https://ex.com/quake",
      source: "Reuters",
    });
    expect(second.topArticle).toBeUndefined();
    expect(result.tokenUsage).toEqual({ reqTokens: 11, remaining: 890 });
  });

  it("makes no extra calls without includeTopArticleUrl", async () => {
    await getBreakingEvents.handler({});
    expect(mockedApiPost).toHaveBeenCalledTimes(1);
  });
});

// ---------- Mentions ----------

describe("search mentions", () => {
  it("sends the mention filters, default count and include flags", async () => {
    const response = {
      mentions: {
        results: [
          {
            uri: "m1",
            dateTime: "2025-01-01T10:00:00Z",
            sentence: "Acme cut 500 jobs.",
            eventType: { uri: "et/business/layoffs", label: "Layoffs" },
            articleUri: "a1",
            articleUrl: "https://ex.com/a1",
            articleTitle: "Acme layoffs",
            sentenceSentiment: -0.4,
            relevance: 12,
            source: { uri: "ex.com", title: "Example", dataType: "news" },
            slots: [
              {
                uri: "acme",
                label: "Acme",
                text: "Acme Inc",
                type: "org",
                core: true,
              },
              { uri: "", label: "", text: "46%", type: "percent" },
            ],
          },
        ],
        totalResults: 1,
        page: 1,
        pages: 1,
      },
    };
    mockedApiPost.mockResolvedValueOnce({
      data: response,
      tokenUsage: { reqTokens: 1, remaining: 9 },
    });

    const result = await search.handler({
      kind: "mentions",
      eventTypeUri: "et/business/layoffs, et/business/hiring",
      conceptUri: "http://en.wikipedia.org/wiki/Acme",
      dateStart: "2025-01-01",
      factLevel: "fact,forecast",
      maxSentenceIndex: 1,
      includeFields: "slots",
    });

    const [path, body] = mockedApiPost.mock.calls[0];
    expect(path).toBe("/eventType/mention");
    expect(body).toEqual({
      action: "getMentions",
      dateStart: "2025-01-01",
      eventTypeUri: ["et/business/layoffs", "et/business/hiring"],
      conceptUri: ["http://en.wikipedia.org/wiki/Acme"],
      factLevel: ["fact", "forecast"],
      maxSentenceIndex: 1,
      mentionsCount: 50,
      resultType: "mentions",
      includeMentionSlots: true,
    });
    const wrapper = (result.data as Record<string, unknown>).mentions as Record<
      string,
      unknown
    >;
    const [m] = wrapper.results as Record<string, unknown>[];
    expect(m.sentence).toBe("Acme cut 500 jobs.");
    expect(m.relevance).toBeUndefined();
    expect(m.eventType).toBe("et/business/layoffs");
    expect(m.source).toEqual({ title: "Example", uri: "ex.com" });
    expect(m.slots).toEqual([
      { uri: "acme", label: "Acme", type: "org" },
      { label: "46%", type: "percent" },
    ]);
    expect(wrapper.totalResults).toBe(1);
  });

  it("passes paging, sorting and the full include set through", async () => {
    await search.handler({
      kind: "mentions",
      keyword: "merger",
      dateStart: "2025-01-01",
      page: 2,
      count: 20,
      sortBy: "rel",
      sortByAsc: true,
      showDuplicates: true,
      includeFields: "full",
    });

    const [, body] = mockedApiPost.mock.calls[0];
    expect(body).toEqual({
      action: "getMentions",
      keyword: ["merger"],
      dateStart: "2025-01-01",
      mentionsPage: 2,
      mentionsCount: 20,
      mentionsSortBy: "rel",
      mentionsSortByAsc: true,
      showDuplicates: true,
      resultType: "mentions",
      includeMentionSlots: true,
      includeMentionCategories: true,
      includeMentionFrameworks: true,
    });
  });

  it("sends filters and resultType only for an aggregate", async () => {
    const aggregate = { eventTypeAggr: { results: [] } };
    mockedApiPost.mockResolvedValueOnce({ data: aggregate });

    const result = await search.handler({
      kind: "mentions",
      conceptUri: "c1",
      dateStart: "2025-01-01",
      resultType: "eventTypeAggr",
      count: 10,
      page: 3,
      includeFields: "slots",
    });

    const [path, body] = mockedApiPost.mock.calls[0];
    expect(path).toBe("/eventType/mention");
    expect(body).toEqual({
      action: "getMentions",
      conceptUri: ["c1"],
      dateStart: "2025-01-01",
      resultType: "eventTypeAggr",
    });
    expect(result.data).toBe(aggregate);
  });

  it("rejects filters the endpoint lacks and tags them in the schema", async () => {
    for (const k of [
      "forceMaxDataTimeWindow",
      "keywordLoc",
      "articleBodyLen",
    ]) {
      await expect(
        search.handler({ kind: "mentions", eventTypeUri: "et/x", [k]: 1 }),
      ).rejects.toThrow(new RegExp(`${k}.*applies to kind`));
    }
    expect(mockedApiPost).not.toHaveBeenCalled();
    const props = search.inputSchema.properties as Record<
      string,
      { description: string }
    >;
    expect(props.forceMaxDataTimeWindow.description).toMatch(
      /^articles\/events only\./,
    );
    expect(props.eventTypeUri.description).toMatch(/^mentions only\./);
    expect(props.keyword.description).not.toMatch(/only\./);
  });

  it("rejects an unknown kind, a foreign sortBy and a foreign aggregate", async () => {
    await expect(search.handler({ kind: "sources" })).rejects.toThrow(
      /kind must be one of/,
    );
    await expect(
      search.handler({ kind: "articles", sortBy: "size" }),
    ).rejects.toThrow(/sortBy .*size.* is not available for kind .*articles/);
    await expect(
      search.handler({ kind: "events", resultType: "langAggr" }),
    ).rejects.toThrow(
      /resultType .*langAggr.* is not available for kind .*events/,
    );
    expect(mockedApiPost).not.toHaveBeenCalled();
  });

  it("explains searches that cost more than one API token", async () => {
    mockedApiPost.mockResolvedValueOnce({
      data: {},
      tokenUsage: { reqTokens: 5, remaining: 1 },
    });
    const ev = await search.handler({ kind: "events", keyword: "x" });
    expect(ev.notes?.join()).toMatch(/Event searches cost 5 API tokens/);
    mockedApiPost.mockResolvedValueOnce({
      data: {},
      tokenUsage: { reqTokens: 10, remaining: 1 },
    });
    const old = await search.handler({
      kind: "articles",
      keyword: "x",
      dateStart: "2025-01-01",
    });
    expect(old.notes?.join()).toMatch(/cost 10 API tokens.*more than 31 days/);
    mockedApiPost.mockResolvedValueOnce({
      data: {},
      tokenUsage: { reqTokens: 1, remaining: 1 },
    });
    const cheap = await search.handler({ kind: "articles", keyword: "x" });
    expect(cheap.notes?.join()).not.toMatch(
      /This search cost|Event searches cost/,
    );
  });

  it("caps count at the kind's maximum", async () => {
    await search.handler({ kind: "events", keyword: "x", count: 100 });
    expect(mockedApiPost.mock.calls[0][1].eventsCount).toBe(50);
  });
});
