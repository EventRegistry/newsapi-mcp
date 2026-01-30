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

import { apiPost, analyticsPost, parseArray } from "../src/client.js";
import {
  searchArticles,
  getArticleDetails,
  streamArticles,
} from "../src/tools/articles.js";
import {
  searchEvents,
  getEventDetails,
  getBreakingEvents,
  streamEvents,
  findEventForText,
} from "../src/tools/events.js";
import { searchMentions } from "../src/tools/mentions.js";
import {
  annotateText,
  categorizeText,
  analyzeSentiment,
  extractArticleInfo,
  detectLanguage,
  computeSemanticSimilarity,
} from "../src/tools/analytics.js";
import {
  getTopicPageArticles,
  getTopicPageEvents,
} from "../src/tools/topic-pages.js";
import { suggestTools } from "../src/tools/suggest.js";
import { getApiUsage } from "../src/tools/usage.js";

const mockedApiPost = vi.mocked(apiPost);
const mockedAnalyticsPost = vi.mocked(analyticsPost);

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

    expect(mockedApiPost).toHaveBeenCalledWith("/article/getArticle", {
      articleUri: ["uri1", "uri2"],
      articleBodyLen: -1,
    });
  });
});

describe("streamArticles", () => {
  it("calls correct endpoint with recentActivityArticles resultType", async () => {
    await streamArticles.handler({ keyword: "AI" });

    expect(mockedApiPost).toHaveBeenCalledWith(
      "/minuteStreamArticles",
      expect.objectContaining({
        resultType: "recentActivityArticles",
        keyword: ["AI"],
      }),
    );
  });
});

// ---------- Events ----------

describe("searchEvents", () => {
  it("calls correct endpoint with resultType", async () => {
    await searchEvents.handler({ keyword: "earthquake" });

    expect(mockedApiPost).toHaveBeenCalledWith(
      "/event/getEvents",
      expect.objectContaining({
        resultType: "events",
        keyword: ["earthquake"],
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
  it("calls correct endpoint with parsed URIs", async () => {
    await getEventDetails.handler({ eventUri: "evt-123,evt-456" });

    expect(mockedApiPost).toHaveBeenCalledWith("/event/getEvent", {
      eventUri: ["evt-123", "evt-456"],
    });
  });
});

describe("getBreakingEvents", () => {
  it("calls correct endpoint with empty body", async () => {
    await getBreakingEvents.handler({});

    expect(mockedApiPost).toHaveBeenCalledWith("/event/getBreakingEvents", {});
  });
});

describe("streamEvents", () => {
  it("calls correct endpoint with resultType and params", async () => {
    await streamEvents.handler({
      recentActivityEventsMaxEventCount: 25,
    });

    expect(mockedApiPost).toHaveBeenCalledWith(
      "/minuteStreamEvents",
      expect.objectContaining({
        resultType: "recentActivityEvents",
        recentActivityEventsMaxEventCount: 25,
      }),
    );
  });
});

describe("findEventForText", () => {
  it("calls correct endpoint with text param", async () => {
    await findEventForText.handler({ text: "A big earthquake hit Japan" });

    expect(mockedApiPost).toHaveBeenCalledWith("/event/getEventForText", {
      text: "A big earthquake hit Japan",
    });
  });
});

// ---------- Mentions ----------

describe("searchMentions", () => {
  it("calls correct endpoint with resultType", async () => {
    await searchMentions.handler({ keyword: "layoff" });

    expect(mockedApiPost).toHaveBeenCalledWith(
      "/article/getMentions",
      expect.objectContaining({
        resultType: "mentions",
        keyword: ["layoff"],
      }),
    );
  });

  it("expands mention-specific array fields", async () => {
    await searchMentions.handler({
      eventTypeUri: "type1,type2",
      industryUri: "sectors/Tech",
      sdgUri: "sdg/sdg5",
      sasbUri: "sasb/env",
      esgUri: "esg/social",
      factLevel: "fact,opinion",
    });

    const body = mockedApiPost.mock.calls[0][1];
    expect(body.eventTypeUri).toEqual(["type1", "type2"]);
    expect(body.industryUri).toEqual(["sectors/Tech"]);
    expect(body.sdgUri).toEqual(["sdg/sdg5"]);
    expect(body.sasbUri).toEqual(["sasb/env"]);
    expect(body.esgUri).toEqual(["esg/social"]);
    expect(body.factLevel).toEqual(["fact", "opinion"]);
  });
});

// ---------- Analytics ----------

describe("annotateText", () => {
  it("calls analyticsPost with /annotate", async () => {
    await annotateText.handler({ text: "Apple released a new product" });

    expect(mockedAnalyticsPost).toHaveBeenCalledWith("/annotate", {
      text: "Apple released a new product",
    });
  });
});

describe("categorizeText", () => {
  it("calls analyticsPost with /categorize", async () => {
    await categorizeText.handler({ text: "Sports news", taxonomy: "news" });

    expect(mockedAnalyticsPost).toHaveBeenCalledWith("/categorize", {
      text: "Sports news",
      taxonomy: "news",
    });
  });
});

describe("analyzeSentiment", () => {
  it("calls analyticsPost with /sentiment", async () => {
    await analyzeSentiment.handler({ text: "I love this" });

    expect(mockedAnalyticsPost).toHaveBeenCalledWith("/sentiment", {
      text: "I love this",
    });
  });
});

describe("extractArticleInfo", () => {
  it("calls analyticsPost with /extractArticleInfo", async () => {
    await extractArticleInfo.handler({ url: "https://example.com/article" });

    expect(mockedAnalyticsPost).toHaveBeenCalledWith("/extractArticleInfo", {
      url: "https://example.com/article",
    });
  });
});

describe("detectLanguage", () => {
  it("calls analyticsPost with /detectLanguage", async () => {
    await detectLanguage.handler({ text: "Bonjour le monde" });

    expect(mockedAnalyticsPost).toHaveBeenCalledWith("/detectLanguage", {
      text: "Bonjour le monde",
    });
  });
});

describe("computeSemanticSimilarity", () => {
  it("calls analyticsPost with /semanticSimilarity", async () => {
    await computeSemanticSimilarity.handler({
      text1: "Hello world",
      text2: "Hi there",
    });

    expect(mockedAnalyticsPost).toHaveBeenCalledWith("/semanticSimilarity", {
      text1: "Hello world",
      text2: "Hi there",
    });
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
  it("calls correct endpoint with uri and resultType", async () => {
    await getTopicPageEvents.handler({ uri: "topic-456" });

    expect(mockedApiPost).toHaveBeenCalledWith(
      "/event/getEventsForTopicPage",
      expect.objectContaining({
        uri: "topic-456",
        resultType: "events",
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
