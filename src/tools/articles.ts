import { apiPost, parseArray } from "../client.js";
import type { ToolDef } from "../types.js";
import {
  parseFieldGroups,
  getArticleIncludeParams,
  filterResponse,
} from "../response-filter.js";

/** Shared content filter properties used by articles, events, and mentions. */
export const contentFilterProps: Record<string, unknown> = {
  keyword: {
    type: "string",
    description:
      "Secondary keyword filter. Use conceptUri as the primary search method. Keywords provide additional text matching within concept results. Multiple keywords can be comma-separated. Exact phrase match when quoted.",
  },
  conceptUri: {
    type: "string",
    description:
      "Primary search filter. Always use suggest_concepts first to resolve entity names to URIs, then pass them here. Prefer this over keyword search for reliable results. Comma-separated for multiple concepts.",
  },
  categoryUri: {
    type: "string",
    description:
      "Category URI(s) to filter by (comma-separated). Use suggest_categories to look up URIs.",
  },
  sourceUri: {
    type: "string",
    description:
      "News source URI(s) to filter by (comma-separated). Use suggest_sources to look up URIs.",
  },
  sourceLocationUri: {
    type: "string",
    description:
      "Source location URI(s) to filter by (comma-separated). Use suggest_locations to look up URIs.",
  },
  authorUri: {
    type: "string",
    description:
      "Author URI(s) to filter by (comma-separated). Use suggest_authors to look up URIs.",
  },
  locationUri: {
    type: "string",
    description:
      "Location URI(s) mentioned in content (comma-separated). Use suggest_locations to look up URIs.",
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
  keywordLoc: {
    type: "string",
    description:
      'Where to match keywords: "body", "title", or "title,body". Default: "body".',
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

/** Params that are NOT API filter params and should be stripped before sending. */
const LOCAL_PARAMS = new Set(["includeFields", "articleBodyLen"]);

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
  ];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    if (LOCAL_PARAMS.has(k)) continue;
    if (k === "query") {
      // Pass through raw query object
      body[k] = typeof v === "string" ? JSON.parse(v as string) : v;
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
  description:
    "Search news articles by concepts, sources, categories, dates, language, and sentiment. Returns up to 100 articles per call. IMPORTANT: Always use suggest_concepts first to resolve names to concept URIs, then search with conceptUri. Use keyword only as a secondary filter alongside conceptUri. Use suggest_* tools to look up URIs for concepts, sources, categories, and locations.",
  inputSchema: {
    type: "object",
    properties: {
      ...contentFilterProps,
      ...responseControlProps,
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
        description: "Articles per page (max 100). Default: 100.",
        default: 100,
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
    const groups = parseFieldGroups(params.includeFields as string | undefined);
    const bodyLen =
      params.articleBodyLen !== undefined
        ? (params.articleBodyLen as number)
        : -1;

    const body = buildFilterBody(params);
    body.resultType = "articles";
    body.articleBodyLen = bodyLen;
    if (params.dataType) {
      body.dataType = parseArray(params.dataType);
    }
    Object.assign(body, getArticleIncludeParams(groups));

    const result = await apiPost("/article/getArticles", body);
    return filterResponse(result, {
      resultType: "articles",
      groups,
      bodyLen,
    });
  },
};

export const getArticleDetails: ToolDef = {
  name: "get_article_details",
  description: "Get full details for one or more articles by their URI(s).",
  inputSchema: {
    type: "object",
    properties: {
      articleUri: {
        type: "string",
        description: "Article URI(s). Comma-separated for multiple.",
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

    const result = await apiPost("/article/getArticle", apiBody);
    return filterResponse(result, {
      resultType: "articles",
      groups,
      bodyLen,
    });
  },
};

export const streamArticles: ToolDef = {
  name: "stream_articles",
  description:
    "Get recently published articles (real-time stream). Returns articles added in the last few minutes. Can return up to 2000 articles. IMPORTANT: Always use suggest_concepts first to resolve names to concept URIs, then filter with conceptUri. Use keyword only as a secondary filter. Use recentActivityArticlesNewsUpdatesAfterUri for deduplication between calls.",
  inputSchema: {
    type: "object",
    properties: {
      ...contentFilterProps,
      ...responseControlProps,
      recentActivityArticlesMaxArticleCount: {
        type: "integer",
        description:
          "Max articles to return (up to 2000). Token cost scales proportionally. Default: 100.",
        default: 100,
        maximum: 2000,
      },
      recentActivityArticlesNewsUpdatesAfterUri: {
        type: "string",
        description:
          "Only return articles added after this URI. Recommended for deduplication between calls.",
      },
      recentActivityArticlesUpdatesAfterMinsAgo: {
        type: "integer",
        description: "Return articles from the last N minutes (max 240).",
      },
    },
  },
  handler: async (params) => {
    const groups = parseFieldGroups(params.includeFields as string | undefined);
    const bodyLen =
      params.articleBodyLen !== undefined
        ? (params.articleBodyLen as number)
        : -1;

    const body = buildFilterBody(params);
    body.resultType = "recentActivityArticles";
    Object.assign(body, getArticleIncludeParams(groups));

    const result = await apiPost("/minuteStreamArticles", body);
    return filterResponse(result, {
      resultType: "articles",
      groups,
      bodyLen,
    });
  },
};

export const articleTools: ToolDef[] = [
  searchArticles,
  getArticleDetails,
  streamArticles,
];
