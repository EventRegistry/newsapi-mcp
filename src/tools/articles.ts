import { apiPost, parseArray } from "../client.js";
import type { ToolDef } from "../types.js";

/** Shared content filter properties used by articles, events, and mentions. */
export const contentFilterProps: Record<string, unknown> = {
  keyword: {
    type: "string",
    description:
      "Keywords to search for. Multiple keywords can be comma-separated. Exact phrase match when quoted.",
  },
  conceptUri: {
    type: "string",
    description:
      "Concept URI(s) to filter by (comma-separated). Use suggest_concepts to look up URIs first.",
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
    "Search news articles by keywords, concepts, sources, categories, dates, language, and sentiment. Returns up to 100 articles per call. Use suggest_* tools first to look up URIs for concepts, sources, categories, and locations.",
  inputSchema: {
    type: "object",
    properties: {
      ...contentFilterProps,
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
    const body = buildFilterBody(params);
    body.resultType = "articles";
    body.articleBodyLen = -1;
    if (params.dataType) {
      body.dataType = parseArray(params.dataType);
    }
    return apiPost("/article/getArticles", body);
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
    },
    required: ["articleUri"],
  },
  handler: async (params) => {
    const uris = parseArray(params.articleUri);
    return apiPost("/article/getArticle", {
      articleUri: uris,
      articleBodyLen: -1,
    });
  },
};

export const streamArticles: ToolDef = {
  name: "stream_articles",
  description:
    "Get recently published articles (real-time stream). Returns articles added in the last few minutes. Can return up to 2000 articles. Use recentActivityArticlesNewsUpdatesAfterUri for deduplication between calls.",
  inputSchema: {
    type: "object",
    properties: {
      ...contentFilterProps,
      recentActivityArticlesMaxArticleCount: {
        type: "integer",
        description:
          "Max articles to return (up to 2000). Token cost scales proportionally. Default: 100.",
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
    const body = buildFilterBody(params);
    body.resultType = "recentActivityArticles";
    return apiPost("/minuteStreamArticles", body);
  },
};

export const articleTools: ToolDef[] = [
  searchArticles,
  getArticleDetails,
  streamArticles,
];
