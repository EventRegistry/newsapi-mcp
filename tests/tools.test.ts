import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the client module before importing tools
vi.mock("../src/client.js", () => ({
  apiPost: vi.fn().mockResolvedValue({ mocked: true }),
  analyticsPost: vi.fn().mockResolvedValue({ mocked: true }),
  parseArray: vi.fn((v: unknown) => {
    if (v === undefined || v === null) return undefined;
    if (Array.isArray(v)) return v.map(String);
    const s = String(v).trim();
    if (s.startsWith("[")) {
      try {
        return JSON.parse(s);
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
  applyDetailLevel,
} from "../src/tools/articles.js";
import { searchEvents, getEventDetails } from "../src/tools/events.js";
import {
  getTopicPageArticles,
  getTopicPageEvents,
} from "../src/tools/topic-pages.js";
import {
  suggest,
  clearSuggestCache,
  getSuggestCacheSize,
} from "../src/tools/suggest.js";
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
        articleBodyLen: -1,
        articlesCount: 10,
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
});

// ---------- Events ----------

describe("searchEvents", () => {
  it("calls correct endpoint with resultType, includeEventSummary, and default count", async () => {
    await searchEvents.handler({ keyword: "earthquake" });

    expect(mockedApiPost).toHaveBeenCalledWith(
      "/event/getEvents",
      expect.objectContaining({
        resultType: "events",
        eventsCount: 10,
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
        articleBodyLen: -1,
        articlesCount: 10,
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
        eventsCount: 10,
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

// ---------- Detail Level ----------

describe("applyDetailLevel", () => {
  it("applies standard preset by default", () => {
    const params: Record<string, unknown> = {};
    applyDetailLevel(params);
    expect(params.articlesCount).toBe(10);
    expect(params.eventsCount).toBe(10);
    expect(params.articleBodyLen).toBe(-1);
  });

  it("applies minimal preset", () => {
    const params: Record<string, unknown> = { detailLevel: "minimal" };
    applyDetailLevel(params);
    expect(params.articlesCount).toBe(5);
    expect(params.eventsCount).toBe(5);
    expect(params.articleBodyLen).toBe(200);
  });

  it("applies full preset", () => {
    const params: Record<string, unknown> = { detailLevel: "full" };
    applyDetailLevel(params);
    expect(params.articlesCount).toBe(50);
    expect(params.eventsCount).toBe(20);
    expect(params.articleBodyLen).toBe(-1);
  });

  it("does not override explicit params", () => {
    const params: Record<string, unknown> = {
      detailLevel: "minimal",
      articlesCount: 30,
      articleBodyLen: 500,
    };
    applyDetailLevel(params);
    expect(params.articlesCount).toBe(30);
    expect(params.articleBodyLen).toBe(500);
    expect(params.eventsCount).toBe(5); // not set explicitly, uses preset
  });
});

describe("detailLevel integration", () => {
  it("searchArticles with minimal detailLevel sends 5 articles and 200 bodyLen", async () => {
    await searchArticles.handler({
      keyword: "AI",
      detailLevel: "minimal",
    });

    const body = mockedApiPost.mock.calls[0][1];
    expect(body.articlesCount).toBe(5);
    expect(body.articleBodyLen).toBe(200);
  });

  it("searchArticles with full detailLevel sends 50 articles", async () => {
    await searchArticles.handler({
      keyword: "AI",
      detailLevel: "full",
    });

    const body = mockedApiPost.mock.calls[0][1];
    expect(body.articlesCount).toBe(50);
    expect(body.articleBodyLen).toBe(-1);
  });

  it("searchEvents with minimal detailLevel sends 5 events", async () => {
    await searchEvents.handler({
      keyword: "earthquake",
      detailLevel: "minimal",
    });

    const body = mockedApiPost.mock.calls[0][1];
    expect(body.eventsCount).toBe(5);
  });

  it("explicit articlesCount overrides detailLevel preset", async () => {
    await searchArticles.handler({
      keyword: "AI",
      detailLevel: "minimal",
      articlesCount: 50,
    });

    const body = mockedApiPost.mock.calls[0][1];
    expect(body.articlesCount).toBe(50);
    expect(body.articleBodyLen).toBe(200); // still from preset
  });

  it("detailLevel is stripped from API body", async () => {
    await searchArticles.handler({
      keyword: "AI",
      detailLevel: "minimal",
    });

    const body = mockedApiPost.mock.calls[0][1];
    expect(body.detailLevel).toBeUndefined();
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

  beforeEach(() => {
    clearSuggestCache();
  });

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

  it("passes custom lang parameter", async () => {
    await suggest.handler({ type: "concepts", prefix: "Test", lang: "deu" });

    expect(mockedApiPost).toHaveBeenCalledWith("/suggestConceptsFast", {
      prefix: "Test",
      lang: "deu",
    });
  });

  describe("caching", () => {
    it("returns cached result on second call without API request", async () => {
      // First call - hits API
      await suggest.handler({ type: "concepts", prefix: "Tesla" });
      expect(mockedApiPost).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await suggest.handler({ type: "concepts", prefix: "Tesla" });
      expect(mockedApiPost).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    it("caches by type/prefix/lang combination", async () => {
      await suggest.handler({ type: "concepts", prefix: "Tesla" });
      await suggest.handler({ type: "concepts", prefix: "Tesla", lang: "deu" });
      await suggest.handler({ type: "sources", prefix: "Tesla" });

      // All three are different cache keys
      expect(mockedApiPost).toHaveBeenCalledTimes(3);
    });

    it("cache key is case-insensitive for prefix", async () => {
      await suggest.handler({ type: "concepts", prefix: "Tesla" });
      await suggest.handler({ type: "concepts", prefix: "tesla" });
      await suggest.handler({ type: "concepts", prefix: "TESLA" });

      // All should hit same cache entry
      expect(mockedApiPost).toHaveBeenCalledTimes(1);
    });

    it("returns same data from cache as from API", async () => {
      const mockResult = [{ uri: "test-uri", label: "Test" }];
      mockedApiPost.mockResolvedValueOnce(mockResult);

      const first = await suggest.handler({ type: "concepts", prefix: "Test" });
      const second = await suggest.handler({
        type: "concepts",
        prefix: "Test",
      });

      expect(first).toEqual(mockResult);
      expect(second).toEqual(mockResult);
    });

    it("tracks cache size correctly", async () => {
      expect(getSuggestCacheSize()).toBe(0);

      await suggest.handler({ type: "concepts", prefix: "One" });
      expect(getSuggestCacheSize()).toBe(1);

      await suggest.handler({ type: "concepts", prefix: "Two" });
      expect(getSuggestCacheSize()).toBe(2);

      // Same key, no size increase
      await suggest.handler({ type: "concepts", prefix: "One" });
      expect(getSuggestCacheSize()).toBe(2);
    });

    it("clearSuggestCache removes all entries", async () => {
      await suggest.handler({ type: "concepts", prefix: "Test" });
      expect(getSuggestCacheSize()).toBe(1);

      clearSuggestCache();
      expect(getSuggestCacheSize()).toBe(0);

      // After clear, API should be called again
      await suggest.handler({ type: "concepts", prefix: "Test" });
      expect(mockedApiPost).toHaveBeenCalledTimes(2);
    });
  });
});

// ---------- Usage ----------

describe("getApiUsage", () => {
  it("calls apiPost with /usage and empty body", async () => {
    await getApiUsage.handler({});

    expect(mockedApiPost).toHaveBeenCalledWith("/usage", {});
  });
});
