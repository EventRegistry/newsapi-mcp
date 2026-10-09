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
import {
  searchArticles,
  getArticleDetails,
  buildFilterBody,
} from "../src/tools/articles.js";
import { ApiError } from "../src/types.js";
import {
  searchEvents,
  getEventDetails,
  getBreakingEvents,
} from "../src/tools/events.js";
import { searchMentions } from "../src/tools/mentions.js";
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

describe("searchArticles", () => {
  it("calls correct endpoint with resultType, articleBodyLen, and default count", async () => {
    await searchArticles.handler({ keyword: "Tesla" });

    expect(mockedApiPost).toHaveBeenCalledWith(
      "/article/getArticles",
      expect.objectContaining({
        resultType: "articles",
        articleBodyLen: 1000,
        articlesCount: 100,
        keyword: ["Tesla"],
      }),
    );
  });

  it("passes includeFields as API include params", async () => {
    await searchArticles.handler({
      keyword: "Tesla",
      includeFields: "concepts,sentiment",
    });

    const body = mockedApiPost.mock.calls[0][1];
    expect(body.includeArticleConcepts).toBe(true);
    expect(body.includeArticleSentiment).toBe(true);
    expect(body.includeFields).toBeUndefined();
  });

  it("expands dataType array field", async () => {
    await searchArticles.handler({ dataType: "news,pr" });

    const body = mockedApiPost.mock.calls[0][1];
    expect(body.dataType).toEqual(["news", "pr"]);
  });

  it("passes pagination params through", async () => {
    await searchArticles.handler({ articlesPage: 2, articlesCount: 50 });

    const body = mockedApiPost.mock.calls[0][1];
    expect(body.articlesPage).toBe(2);
    expect(body.articlesCount).toBe(50);
  });

  it("passes dateMentionStart/dateMentionEnd through as strings", async () => {
    await searchArticles.handler({
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

describe("searchEvents", () => {
  it("calls correct endpoint with resultType, includeEventSummary, and default count", async () => {
    await searchEvents.handler({ keyword: "earthquake" });

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
    await searchEvents.handler({
      minArticlesInEvent: 10,
      reportingDateStart: "2024-01-01",
    });

    const body = mockedApiPost.mock.calls[0][1];
    expect(body.minArticlesInEvent).toBe(10);
    expect(body.reportingDateStart).toBe("2024-01-01");
  });

  it("renames minSentiment/maxSentiment to event-specific param names", async () => {
    await searchEvents.handler({
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

  it("strips article-only source rank params", async () => {
    await searchEvents.handler({
      keyword: "earthquake",
      startSourceRankPercentile: 0,
      endSourceRankPercentile: 50,
    });

    const body = mockedApiPost.mock.calls[0][1];
    expect(body.startSourceRankPercentile).toBeUndefined();
    expect(body.endSourceRankPercentile).toBeUndefined();
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
  it("searchArticles expands ignore* params as arrays", async () => {
    await searchArticles.handler({
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

  it("searchEvents expands ignore* params as arrays", async () => {
    await searchEvents.handler({
      keyword: "earthquake",
      ignoreKeyword: "tsunami,flood",
      ignoreCategoryUri: "cat1",
    });

    const body = mockedApiPost.mock.calls[0][1];
    expect(body.ignoreKeyword).toEqual(["tsunami", "flood"]);
    expect(body.ignoreCategoryUri).toEqual(["cat1"]);
  });

  it("passes ignoreKeywordLoc as scalar string", async () => {
    await searchArticles.handler({
      keyword: "AI",
      ignoreKeyword: "spam",
      ignoreKeywordLoc: "title",
    });
    const body = mockedApiPost.mock.calls[0][1];
    expect(body.ignoreKeywordLoc).toBe("title");
  });

  it("searchArticles passes sourceGroupUri and operator params", async () => {
    await searchArticles.handler({
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

describe("searchEvents operators and sourceGroupUri", () => {
  it("passes operator and sourceGroupUri params through", async () => {
    await searchEvents.handler({
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
  it("searchArticles sends articlesCount: 100 and articleBodyLen: 1000 by default", async () => {
    await searchArticles.handler({ keyword: "AI" });

    const body = mockedApiPost.mock.calls[0][1];
    expect(body.articlesCount).toBe(100);
    expect(body.articleBodyLen).toBe(1000);
  });

  it("searchEvents sends eventsCount: 50 by default", async () => {
    await searchEvents.handler({ keyword: "earthquake" });

    const body = mockedApiPost.mock.calls[0][1];
    expect(body.eventsCount).toBe(50);
  });

  it("explicit params override defaults", async () => {
    await searchArticles.handler({
      keyword: "AI",
      articlesCount: 10,
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
  it("search_articles sends filters and resultType only, returns data unfiltered", async () => {
    const aggregate = {
      timeAggr: { results: [{ date: "2025-01-01", count: 3 }] },
    };
    mockedApiPost.mockResolvedValueOnce({ data: aggregate });

    const result = await searchArticles.handler({
      keyword: "Tesla",
      dateStart: "2025-01-01",
      resultType: "timeAggr",
      articlesCount: 10,
      articlesPage: 2,
      articlesSortBy: "rel",
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

  it("search_events sends filters and resultType only, with event param names", async () => {
    await searchEvents.handler({
      keyword: "earthquake",
      dateStart: "2025-01-01",
      minSentiment: -0.5,
      startSourceRankPercentile: 0,
      resultType: "sourceAggr",
      eventsCount: 10,
      eventsPage: 2,
      eventsSortBy: "size",
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
    await searchArticles.handler({ keyword: "Tesla", resultType: "articles" });

    const body = mockedApiPost.mock.calls[0][1];
    expect(body.resultType).toBe("articles");
    expect(body.articlesCount).toBe(100);
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
});

// ---------- Mentions ----------

describe("searchMentions", () => {
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

    const result = await searchMentions.handler({
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
      mentionsCount: 100,
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
    await searchMentions.handler({
      keyword: "merger",
      dateStart: "2025-01-01",
      mentionsPage: 2,
      mentionsCount: 20,
      mentionsSortBy: "rel",
      mentionsSortByAsc: true,
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

    const result = await searchMentions.handler({
      conceptUri: "c1",
      dateStart: "2025-01-01",
      resultType: "eventTypeAggr",
      mentionsCount: 10,
      mentionsPage: 3,
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

  it("does not expose filters the endpoint lacks", () => {
    const props = searchMentions.inputSchema.properties as Record<
      string,
      unknown
    >;
    for (const k of [
      "forceMaxDataTimeWindow",
      "keywordLoc",
      "authorUri",
      "dateMentionStart",
      "articleBodyLen",
    ]) {
      expect(props[k]).toBeUndefined();
    }
    expect(props.eventTypeUri).toBeDefined();
    expect(props.keyword).toBeDefined();
  });
});
