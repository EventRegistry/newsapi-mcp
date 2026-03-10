import { apiPost, parseArray } from "../client.js";
import { ApiError } from "../types.js";
import type { ToolDef } from "../types.js";
import {
  parseFieldGroups,
  getArticleIncludeParams,
  filterResponse,
} from "../response-filter.js";
import { formatArticleResults, formatArticleDetails } from "../formatters.js";

/** Shared content filter properties. Some props (e.g. sourceRankPercentile) are article-only and stripped by events handler. */
export const contentFilterProps: Record<string, unknown> = {
  keyword: {
    type: "string",
    description:
      'Secondary keyword filter. Use conceptUri as the primary search method. Keywords narrow concept results — especially useful with broad concepts (e.g., keyword: "2026" with Olympic Games concept). Also effective as a fallback when a specific concept returns no results. IMPORTANT: each keyword value is matched as an exact phrase. Comma-separate individual words for multi-term matching (e.g., "SaaS, acquisition, merger" NOT "SaaS acquisition merger"). Use keywordOper to control AND/OR logic for comma-separated keywords.',
  },
  conceptUri: {
    type: "string",
    description:
      'Primary search filter. Always use suggest(type: "concepts") first to resolve entity names to URIs, then pass them here. Prefer this over keyword search for reliable results. Comma-separated for multiple concepts. Prefer well-established concepts over year-specific ones (e.g., "Olympic Games" not "2026 Olympics"). Combine broad concept + keyword for precision.',
  },
  categoryUri: {
    type: "string",
    description:
      'Category URI(s) to filter by (comma-separated). Use suggest(type: "categories") to look up URIs.',
  },
  sourceUri: {
    type: "string",
    description:
      'Specific news source URI(s) to filter by (e.g., Reuters, BBC). Use suggest(type: "sources") to look up URIs. For sources from a country/region, use sourceLocationUri instead.',
  },
  sourceLocationUri: {
    type: "string",
    description:
      'Filter by where news sources are based (e.g., sources from Slovenia, UK). Use suggest(type: "locations") to look up country/region URIs. Prefer this over sourceUri when filtering by country.',
  },
  authorUri: {
    type: "string",
    description:
      'Author URI(s) to filter by (comma-separated). Use suggest(type: "authors") to look up URIs.',
  },
  locationUri: {
    type: "string",
    description:
      'Location URI(s) mentioned in content (comma-separated). Use suggest(type: "locations") to look up URIs.',
  },
  lang: {
    type: "string",
    description:
      'Language code(s) to filter by (comma-separated ISO codes, e.g. "eng", "deu", "fra").',
  },
  dateStart: {
    type: "string",
    description: "Start date inclusive (YYYY-MM-DD).",
  },
  dateEnd: {
    type: "string",
    description: "End date inclusive (YYYY-MM-DD).",
  },
  forceMaxDataTimeWindow: {
    type: "integer",
    description:
      "Limit results to recent data: 7 (last week) or 31 (last month). Use this instead of dateStart/dateEnd for recent news queries to minimize token usage. Omit to search all available data.",
    enum: [7, 31],
  },
  keywordLoc: {
    type: "string",
    description:
      'Where to match keywords: "body", "title", or "title,body" (OR — matches in either location). Default: "body".',
    enum: ["body", "title", "title,body"],
  },
  keywordOper: {
    type: "string",
    description:
      'Boolean operator for multiple keywords: "and" or "or". Default: "and".',
    enum: ["and", "or"],
  },
  minSentiment: {
    type: "number",
    description: "Minimum sentiment (-1 to 1).",
  },
  maxSentiment: {
    type: "number",
    description: "Maximum sentiment (-1 to 1).",
  },
  startSourceRankPercentile: {
    type: "integer",
    description:
      "Min source rank percentile (0-100). Lower = more important. Default: 0.",
  },
  endSourceRankPercentile: {
    type: "integer",
    description: "Max source rank percentile (0-100). Default: 100.",
  },
  ignoreKeyword: {
    type: "string",
    description:
      "Exclude articles/events mentioning these keywords. Comma-separated for multiple.",
  },
  ignoreConceptUri: {
    type: "string",
    description:
      'Exclude by concept URI(s). Comma-separated for multiple. Use suggest(type: "concepts") to look up URIs.',
  },
  ignoreCategoryUri: {
    type: "string",
    description:
      'Exclude by category URI(s). Comma-separated for multiple. Use suggest(type: "categories") to look up URIs.',
  },
  ignoreSourceUri: {
    type: "string",
    description:
      'Exclude by source URI(s). Comma-separated for multiple. Use suggest(type: "sources") to look up URIs.',
  },
  ignoreSourceLocationUri: {
    type: "string",
    description:
      'Exclude by source location URI(s). Comma-separated for multiple. Use suggest(type: "locations") to look up URIs.',
  },
  ignoreSourceGroupUri: {
    type: "string",
    description:
      "Exclude by source group URI(s). Comma-separated for multiple.",
  },
  ignoreAuthorUri: {
    type: "string",
    description:
      'Exclude by author URI(s). Comma-separated for multiple. Use suggest(type: "authors") to look up URIs.',
  },
  ignoreLocationUri: {
    type: "string",
    description:
      'Exclude by location URI(s). Comma-separated for multiple. Use suggest(type: "locations") to look up URIs.',
  },
  ignoreLang: {
    type: "string",
    description:
      'Exclude by language code(s). Comma-separated ISO codes (e.g. "eng", "deu").',
  },
  ignoreKeywordLoc: {
    type: "string",
    description:
      'Where to match ignoreKeyword: "body", "title", or "title,body". Default: "body".',
    enum: ["body", "title", "title,body"],
  },
  sourceGroupUri: {
    type: "string",
    description: "Filter by source group URI(s). Comma-separated for multiple.",
  },
  conceptOper: {
    type: "string",
    description:
      'Boolean operator for multiple concepts: "and" or "or". Default: "and".',
    enum: ["and", "or"],
  },
  categoryOper: {
    type: "string",
    description:
      'Boolean operator for multiple categories: "and" or "or". Default: "or".',
    enum: ["and", "or"],
  },
  dateMentionStart: {
    type: "string",
    description:
      "Articles mentioning dates >= this (YYYY-MM-DD). Filters by dates mentioned in content.",
  },
  dateMentionEnd: {
    type: "string",
    description:
      "Articles mentioning dates <= this (YYYY-MM-DD). Filters by dates mentioned in content.",
  },
};

/** Response control properties for article-returning tools. */
export const responseControlProps: Record<string, unknown> = {
  includeFields: {
    type: "string",
    description:
      "Comma-separated field groups to include beyond the minimal set (title, body, date, source). Options: sentiment, concepts, categories, images, authors, location, social, metadata, event, full. Default: minimal only.",
  },
  articleBodyLen: {
    type: "integer",
    description:
      "Article body length in characters. Default: -1 (full text). Use 0 to exclude body, or a positive number to truncate.",
  },
};

/** Response control for non-article tools (no articleBodyLen). */
export const includeFieldsProp: Record<string, unknown> = {
  includeFields: {
    type: "string",
    description:
      "Comma-separated field groups to include beyond the minimal set. Options: sentiment, concepts, categories, images, authors, location, social, metadata, event, full. Default: minimal only.",
  },
};

/** Detail level presets for controlling response size. */
export const detailLevelProp: Record<string, unknown> = {
  detailLevel: {
    type: "string",
    description:
      'Controls result count and body length. "minimal": 5 results, 200-char bodies. ' +
      '"standard": 10 results, full bodies. ' +
      '"extended" (default): 50 articles/20 events, 1000-char bodies. ' +
      '"full": 50 articles/20 events, full bodies (may be truncated if too large). ' +
      'Prefer "standard" or "extended" to ensure sufficient coverage.',
    enum: ["minimal", "standard", "extended", "full"],
  },
};

const DETAIL_PRESETS: Record<string, Record<string, number>> = {
  minimal: { articlesCount: 5, eventsCount: 5, articleBodyLen: 200 },
  standard: { articlesCount: 10, eventsCount: 10, articleBodyLen: -1 },
  extended: { articlesCount: 50, eventsCount: 20, articleBodyLen: 1000 },
  full: { articlesCount: 50, eventsCount: 20, articleBodyLen: -1 },
};

/** Apply detailLevel preset values for any params not explicitly set. */
export function applyDetailLevel(params: Record<string, unknown>): void {
  const level = (params.detailLevel as string) ?? "extended";
  const preset = DETAIL_PRESETS[level] ?? DETAIL_PRESETS["extended"]!;
  for (const [k, v] of Object.entries(preset)) {
    if (params[k] === undefined) {
      params[k] = v;
    }
  }
}

/** Params that are NOT API filter params and should be stripped before sending. */
const LOCAL_PARAMS = new Set([
  "includeFields",
  "articleBodyLen",
  "detailLevel",
]);

/** Build the request body from params, expanding array-typed fields. */
export function buildFilterBody(
  params: Record<string, unknown>,
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  const arrayFields = [
    "keyword",
    "conceptUri",
    "categoryUri",
    "sourceUri",
    "sourceLocationUri",
    "authorUri",
    "locationUri",
    "lang",
    "ignoreKeyword",
    "ignoreConceptUri",
    "ignoreCategoryUri",
    "ignoreSourceUri",
    "ignoreSourceLocationUri",
    "ignoreSourceGroupUri",
    "ignoreAuthorUri",
    "ignoreLocationUri",
    "ignoreLang",
    "sourceGroupUri",
  ];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    if (LOCAL_PARAMS.has(k)) continue;
    if (k === "query") {
      if (typeof v === "string") {
        try {
          body[k] = JSON.parse(v);
        } catch {
          throw new ApiError(400, `Invalid JSON in "query" parameter`);
        }
      } else {
        body[k] = v;
      }
    } else if (arrayFields.includes(k)) {
      body[k] = parseArray(v);
    } else {
      body[k] = v;
    }
  }
  return body;
}

export const searchArticles: ToolDef = {
  name: "search_articles",
  description: `Search news articles by concepts, sources, categories, dates, language, and sentiment. Returns up to 100 articles per call.

WORKFLOW: Use suggest tool first to resolve names to URIs, then search with conceptUri. Use keyword only as a secondary text filter.
EXAMPLE: search_articles({conceptUri: "<uri>", dateStart: "2025-01-01", lang: "eng"})

USE THIS WHEN you need individual articles with full text, dates, and sources.
NOT THIS when you need high-level event summaries — use search_events instead.`,
  inputSchema: {
    type: "object",
    properties: {
      ...contentFilterProps,
      ...responseControlProps,
      ...detailLevelProp,
      isDuplicateFilter: {
        type: "string",
        description:
          'Duplicate handling: "keepAll" (default), "skipDuplicates", "keepOnlyDuplicates".',
        enum: ["keepAll", "skipDuplicates", "keepOnlyDuplicates"],
      },
      dataType: {
        type: "string",
        description:
          'Content types (comma-separated): "news", "pr", "blog". Default: "news".',
      },
      articlesPage: {
        type: "integer",
        description: "Page number (starting from 1). Default: 1.",
      },
      articlesCount: {
        type: "integer",
        description: "Articles per page (max 100). Default set by detailLevel.",
        maximum: 100,
      },
      articlesSortBy: {
        type: "string",
        description:
          'Sort by: "date", "rel", "sourceImportance", "socialScore". Default: "date".',
        enum: [
          "date",
          "rel",
          "sourceImportance",
          "sourceAlexaGlobalRank",
          "socialScore",
          "facebookShares",
        ],
      },
      articlesSortByAsc: {
        type: "boolean",
        description: "Ascending sort order. Default: false.",
      },
      query: {
        type: ["object", "string"],
        description:
          "Advanced Query Language object for complex boolean logic. See API docs. Overrides simple filter params when provided.",
      },
    },
  },
  handler: async (params) => {
    applyDetailLevel(params);
    const groups = parseFieldGroups(params.includeFields as string | undefined);
    const bodyLen = (params.articleBodyLen as number) ?? -1;

    const body = buildFilterBody(params);
    body.resultType = "articles";
    body.articleBodyLen = bodyLen;
    if (params.dataType) {
      body.dataType = parseArray(params.dataType);
    }
    Object.assign(body, getArticleIncludeParams(groups));

    const { data, tokenUsage } = await apiPost("/article/getArticles", body);
    return {
      data: filterResponse(data, {
        resultType: "articles",
        groups,
        bodyLen,
      }),
      tokenUsage,
    };
  },
  formatter: formatArticleResults,
};

export const getArticleDetails: ToolDef = {
  name: "get_article_details",
  description: `Get full details for one or more articles by their URI(s).

EXAMPLE: get_article_details({articleUri: "123456789", includeFields: "concepts,sentiment"})
EXAMPLE (multiple): get_article_details({articleUri: ["123456789", "987654321"]})

USE THIS WHEN you already have article URIs from search results and need more details.
NOT THIS for searching — use search_articles with filters instead.`,
  inputSchema: {
    type: "object",
    properties: {
      articleUri: {
        oneOf: [
          { type: "string" },
          { type: "array", items: { type: "string" } },
        ],
        description:
          "Article URI or array of URIs. Also accepts comma-separated string.",
      },
      ...responseControlProps,
    },
    required: ["articleUri"],
  },
  handler: async (params) => {
    const groups = parseFieldGroups(params.includeFields as string | undefined);
    const bodyLen =
      params.articleBodyLen !== undefined
        ? (params.articleBodyLen as number)
        : -1;

    const uris = parseArray(params.articleUri);
    const apiBody: Record<string, unknown> = {
      articleUri: uris,
      articleBodyLen: bodyLen,
      ...getArticleIncludeParams(groups),
    };

    const { data, tokenUsage } = await apiPost("/article/getArticle", apiBody);
    return {
      data: filterResponse(data, {
        resultType: "articles",
        groups,
        bodyLen,
      }),
      tokenUsage,
    };
  },
  formatter: formatArticleDetails,
};

export const articleTools: ToolDef[] = [searchArticles, getArticleDetails];
