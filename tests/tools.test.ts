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
    return s.split(",").map((x: string) => x.trim());
  }),
  initClient: vi.fn(),
}));

import { apiPost, parseArray } from "../src/client.js";
import { searchArticles, getArticleDetails } from "../src/tools/articles.js";
import {
  searchEvents,
  getEventDetails,
  findEventForText,
} from "../src/tools/events.js";
import {
  getTopicPageArticles,
  getTopicPageEvents,
} from "../src/tools/topic-pages.js";
import { suggestTools } from "../src/tools/suggest.js";
import { getApiUsage } from "../src/tools/usage.js";

const mockedApiPost = vi.mocked(apiPost);

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------- Articles ----------

describe("searchArticles", () => {
  it("calls correct endpoint with resultType and articleBodyLen", async () => {
    await searchArticles.handler({ keyword: "Tesla" });

    expect(mockedApiPost).toHaveBeenCalledWith(
      "/article/getArticles",
      expect.objectContaining({
        resultType: "articles",
        articleBodyLen: -1,
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
  it("calls correct endpoint with resultType and includeEventSummary", async () => {
    await searchEvents.handler({ keyword: "earthquake" });

    expect(mockedApiPost).toHaveBeenCalledWith(
      "/event/getEvents",
      expect.objectContaining({
        resultType: "events",
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

describe("findEventForText", () => {
  it("calls correct endpoint with text param and includeEventSummary", async () => {
    await findEventForText.handler({ text: "A big earthquake hit Japan" });

    expect(mockedApiPost).toHaveBeenCalledWith(
      "/event/getEvents",
      expect.objectContaining({
        keyword: "A big earthquake hit Japan",
        resultType: "events",
        eventsCount: 1,
        eventsSortBy: "rel",
        includeEventSummary: true,
      }),
    );
  });
});

// ---------- Topic Pages ----------

describe("getTopicPageArticles", () => {
  it("calls correct endpoint with uri and resultType", async () => {
    await getTopicPageArticles.handler({ uri: "topic-123" });

    expect(mockedApiPost).toHaveBeenCalledWith(
      "/article/getArticlesForTopicPage",
      expect.objectContaining({
        uri: "topic-123",
        resultType: "articles",
        articleBodyLen: -1,
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
  it("calls correct endpoint with uri, resultType, and includeEventSummary", async () => {
    await getTopicPageEvents.handler({ uri: "topic-456" });

    expect(mockedApiPost).toHaveBeenCalledWith(
      "/event/getEventsForTopicPage",
      expect.objectContaining({
        uri: "topic-456",
        resultType: "events",
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

// ---------- Suggest ----------

describe("suggestTools", () => {
  const expectedPaths: Record<string, string> = {
    suggest_concepts: "/suggestConceptsFast",
    suggest_categories: "/suggestCategoriesFast",
    suggest_sources: "/suggestSourcesFast",
    suggest_locations: "/suggestLocationsFast",
    suggest_authors: "/suggestAuthorsFast",
  };

  it("has 5 suggest tools", () => {
    expect(suggestTools).toHaveLength(5);
  });

  for (const [name, path] of Object.entries(expectedPaths)) {
    it(`${name} calls apiPost with ${path}`, async () => {
      const tool = suggestTools.find((t) => t.name === name)!;
      expect(tool).toBeDefined();

      await tool.handler({ prefix: "Test" });

      expect(mockedApiPost).toHaveBeenCalledWith(path, {
        prefix: "Test",
        lang: "eng",
      });
    });
  }

  it("all suggest tools require prefix param", () => {
    for (const tool of suggestTools) {
      expect(tool.inputSchema.required).toEqual(["prefix"]);
    }
  });
});

// ---------- Usage ----------

describe("getApiUsage", () => {
  it("calls apiPost with /usage and empty body", async () => {
    await getApiUsage.handler({});

    expect(mockedApiPost).toHaveBeenCalledWith("/usage", {});
  });
});
