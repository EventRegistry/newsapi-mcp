import { describe, it, expect } from "vitest";
import { buildSearchBody, DEFAULT_WINDOW_DAYS } from "../src/query.js";
import { formatArticleResults } from "../src/formatters.js";

describe("buildSearchBody", () => {
  it("defaults to a 31-day window and says so", () => {
    const { body, notes } = buildSearchBody({ conceptUri: "a" });
    expect(body.forceMaxDataTimeWindow).toBe(DEFAULT_WINDOW_DAYS);
    expect(notes[0]).toMatch(/last 31 days/);
  });

  it("leaves an explicit date window alone", () => {
    const { body, notes } = buildSearchBody({ keyword: "x", dateStart: "2024-01-01" });
    expect(body.forceMaxDataTimeWindow).toBeUndefined();
    expect(notes).toEqual([]);
  });

  it("uses dateStart for endpoints without forceMaxDataTimeWindow", () => {
    const { body } = buildSearchBody({ keyword: "x" }, { dateDefault: "dateStart" });
    expect(body.dateStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("upgrades a boolean keyword to exact mode", () => {
    const { body, notes } = buildSearchBody({
      keyword: "Tesla AND (recall OR lawsuit) NOT Musk",
      dateStart: "2025-01-01",
    });
    expect(body.keywordSearchMode).toBe("exact");
    expect(body.keyword).toEqual(["Tesla AND (recall OR lawsuit) NOT Musk"]);
    expect(notes[0]).toMatch(/boolean/);
  });

  it("keeps comma lists in phrase mode", () => {
    const { body } = buildSearchBody({ keyword: "recall, lawsuit", keywordOper: "or", dateStart: "2025-01-01" });
    expect(body.keywordSearchMode).toBeUndefined();
    expect(body.keyword).toEqual(["recall", "lawsuit"]);
  });

  it("folds flat filters into an advanced query", () => {
    const { body, notes } = buildSearchBody({
      query: { $query: { $or: [{ conceptUri: "a" }, { keyword: "b" }] } },
      lang: "eng,deu",
      dateStart: "2025-01-01",
      ignoreConceptUri: "c",
      isDuplicateFilter: "skipDuplicates",
      minSentiment: 0.2,
    });
    expect(body.lang).toBeUndefined();
    expect(body.ignoreConceptUri).toBeUndefined();
    expect(body.isDuplicateFilter).toBeUndefined();
    expect(body.query).toEqual({
      $query: {
        $and: [
          { $or: [{ conceptUri: "a" }, { keyword: "b" }] },
          { lang: { $or: ["eng", "deu"] }, dateStart: "2025-01-01" },
        ],
        $not: { conceptUri: "c" },
      },
      $filter: { isDuplicate: "skipDuplicates", minSentiment: 0.2 },
    });
    expect(notes[0]).toMatch(/ANDed/);
  });

  it("normalises arrays and $not lists inside the query", () => {
    const { body } = buildSearchBody({
      query: JSON.stringify({
        $query: { $and: [{ conceptUri: ["a", "b"], dateStart: "2025-01-01" }], $not: [{ keyword: "x" }, { keyword: "y" }] },
      }),
    });
    expect(body.query).toEqual({
      $query: {
        $and: [{ conceptUri: { $or: ["a", "b"] }, dateStart: "2025-01-01" }],
        $not: { $or: [{ keyword: "x" }, { keyword: "y" }] },
      },
    });
  });

  it("adds the window to $filter when the query has no date", () => {
    const { body, notes } = buildSearchBody({ query: { $query: { keyword: "x" } } });
    expect((body.query as Record<string, unknown>).$filter).toEqual({ forceMaxDataTimeWindow: "31" });
    expect(notes.some((n) => /last 31 days/.test(n))).toBe(true);
  });

  it("rejects a $not without positive conditions", () => {
    expect(() => buildSearchBody({ query: { $query: { $and: [{ $not: { keyword: "x" } }], dateStart: "2025-01-01" } } })).toThrow(/\$not/);
  });
});

describe("formatArticleResults scan rows", () => {
  it("renders one row per article with uri, date, source, title and url", () => {
    const data = {
      articles: {
        results: [
          { uri: "123", title: "T", dateTimePub: "2025-03-04T10:00:00Z", source: { title: "S" }, url: "https://ex.com/t" },
        ],
        totalResults: 250, page: 1, pages: 3,
      },
    };
    const out = formatArticleResults(data, { articleBodyLen: 0 });
    expect(out).toContain("# | uri | date | source | title");
    expect(out).toContain("1 | 123 | 2025-03-04 | S | T");
    expect(out).not.toContain("https://ex.com/t");
    expect(out).toContain("Page 1 of 3");
    expect(out).not.toContain("URL:");
  });
});

describe("options object", () => {
  it("flattens options into the request and keeps the schema nested", async () => {
    const { searchArticles, flattenOptions } = await import("../src/tools/articles.js");
    const flat = flattenOptions({ conceptUri: "a", options: { minSentiment: 0.3, dataType: "news,pr" } });
    expect(flat).toEqual({ conceptUri: "a", minSentiment: 0.3, dataType: "news,pr" });
    const opts = searchArticles.inputSchema.properties.options as { type: string; properties: Record<string, unknown> };
    expect(opts.type).toBe("object");
    expect(Object.keys(opts.properties)).toEqual(expect.arrayContaining(["minSentiment", "endSourceRankPercentile", "dataType", "articlesSortByAsc"]));
    expect(searchArticles.inputSchema.properties).not.toHaveProperty("minSentiment");
  });
});
