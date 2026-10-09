import { apiPost, parseArray } from "../client.js";
import type { ToolDef } from "../types.js";
import { buildSearchBody } from "../query.js";
import type { SearchKind } from "./search.js";
import {
  parseFieldGroups,
  getArticleIncludeParams,
  filterResponse,
} from "../response-filter.js";
import { formatArticleResults, formatArticleDetails } from "../formatters.js";

/** All shared content filters; the search tools expose the common ones at top level and the rest under `options`. */
export const contentFilterProps: Record<string, unknown> = {
  keyword: {
    type: "string",
    description:
      "Text filter; each value is an exact phrase (comma-separate several). One boolean expression is also accepted: \"Tesla AND (recall OR lawsuit) NOT Musk\".",
  },
  keywordSearchMode: {
    type: "string",
    description:
      "\"phrase\" (default), \"exact\" (boolean expression; auto-detected), \"simple\" (relevance ranking, noisy).",
    enum: ["phrase", "exact", "simple"],
  },
  conceptUri: {
    type: "string",
    description:
      "Entity URI(s) from suggest(type: \"concepts\"), comma-separated (AND; see conceptOper). The primary filter.",
  },
  categoryUri: {
    type: "string",
    description:
      "Category URI(s), comma-separated; from suggest(type: \"categories\").",
  },
  sourceUri: {
    type: "string",
    description:
      "Source URI(s), comma-separated; from suggest(type: \"sources\"). For a country's sources use sourceLocationUri.",
  },
  sourceLocationUri: {
    type: "string",
    description:
      "Location URI(s) where the sources are based; from suggest(type: \"locations\").",
  },
  authorUri: {
    type: "string",
    description:
      "Author URI(s), comma-separated; from suggest(type: \"authors\").",
  },
  locationUri: {
    type: "string",
    description:
      "URI(s) of places the content is about, comma-separated; from suggest(type: \"locations\").",
  },
  lang: {
    type: "string",
    description:
      "Language code(s), comma-separated ISO-3 (\"eng\", \"deu\", \"slv\").",
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
      "Only the last 7 or 31 days. Default when no date is given: 31 (1 API token); older dates cost 5-65x.",
    enum: [7, 31],
  },
  keywordLoc: {
    type: "string",
    description:
      "Where keyword matches: \"body\" (default), \"title\", \"title,body\".",
    enum: ["body", "title", "title,body"],
  },
  keywordOper: {
    type: "string",
    description:
      "\"and\" (default) or \"or\" between comma-separated keywords.",
    enum: ["and", "or"],
  },
  minSentiment: {
    type: "number",
    description: "Minimum sentiment, -1 to 1 (English articles only).",
  },
  maxSentiment: {
    type: "number",
    description: "Maximum sentiment, -1 to 1.",
  },
  startSourceRankPercentile: {
    type: "integer",
    description:
      "Min source rank percentile, 0-90 in steps of 10 (0 = most important).",
  },
  endSourceRankPercentile: {
    type: "integer",
    description: "Max source rank percentile, 10-100 in steps of 10; e.g. 30 keeps the top 30% of sources.",
  },
  ignoreKeyword: {
    type: "string",
    description:
      "Exclude by keyword(s), comma-separated.",
  },
  ignoreConceptUri: {
    type: "string",
    description:
      "Exclude by concept URI(s), comma-separated.",
  },
  ignoreCategoryUri: {
    type: "string",
    description:
      "Exclude category URI(s), comma-separated.",
  },
  ignoreSourceUri: {
    type: "string",
    description:
      "Exclude by source URI(s), comma-separated.",
  },
  ignoreSourceLocationUri: {
    type: "string",
    description:
      "Exclude sources based in these location URI(s).",
  },
  ignoreSourceGroupUri: {
    type: "string",
    description:
      "Exclude source group URI(s).",
  },
  ignoreAuthorUri: {
    type: "string",
    description:
      "Exclude author URI(s).",
  },
  ignoreLocationUri: {
    type: "string",
    description:
      "Exclude content about these location URI(s).",
  },
  ignoreLang: {
    type: "string",
    description:
      "Exclude language code(s), e.g. \"eng,deu\".",
  },
  ignoreKeywordLoc: {
    type: "string",
    description:
      "Where ignoreKeyword is matched: \"body\" (default), \"title\", \"title,body\".",
    enum: ["body", "title", "title,body"],
  },
  sourceGroupUri: {
    type: "string",
    description: "Source group URI(s), comma-separated.",
  },
  conceptOper: {
    type: "string",
    description:
      "\"and\" (default) or \"or\" between comma-separated concepts.",
    enum: ["and", "or"],
  },
  categoryOper: {
    type: "string",
    description:
      "Operator for several categoryUri values: \"or\" (default) or \"and\".",
    enum: ["and", "or"],
  },
  dateMentionStart: {
    type: "string",
    description:
      "Keep articles whose text mentions a date on/after YYYY-MM-DD.",
  },
  dateMentionEnd: {
    type: "string",
    description:
      "Keep articles whose text mentions a date on/before YYYY-MM-DD (often empty when combined with dateMentionStart).",
  },
};

/** Filters most searches never need; they live under `options` to keep the schema small. */
export const RARE_FILTER_KEYS = [
  "authorUri",
  "locationUri",
  "sourceGroupUri",
  "categoryOper",
  "minSentiment",
  "maxSentiment",
  "startSourceRankPercentile",
  "endSourceRankPercentile",
  "ignoreCategoryUri",
  "ignoreSourceLocationUri",
  "ignoreSourceGroupUri",
  "ignoreAuthorUri",
  "ignoreLocationUri",
  "ignoreLang",
  "ignoreKeywordLoc",
  "dateMentionStart",
  "dateMentionEnd",
] as const;

const rare = new Set<string>(RARE_FILTER_KEYS);

/** The common filters, exposed at the top level of each search tool. */
export const coreFilterProps: Record<string, unknown> = Object.fromEntries(
  Object.entries(contentFilterProps).filter(([k]) => !rare.has(k)),
);

/** Merge `options` into the flat params the handlers and request builder work with. */
export function flattenOptions(
  params: Record<string, unknown>,
): Record<string, unknown> {
  const { options, ...rest } = params;
  return options && typeof options === "object"
    ? { ...rest, ...(options as Record<string, unknown>) }
    : rest;
}

/** Response control properties for article-returning tools. */
export const responseControlProps: Record<string, unknown> = {
  includeFields: {
    type: "string",
    description:
      "Extra field groups, comma-separated: sentiment, concepts, categories, images, authors, location, social, metadata, event, full. Default: none.",
  },
  articleBodyLen: {
    type: "integer",
    description:
      "Body chars per article. Default 1000; -1 full text; 0 titles only (scan rows).",
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

/** Request body only, for callers that do not surface the server's notes. */
export function buildFilterBody(
  params: Record<string, unknown>,
): Record<string, unknown> {
  return buildSearchBody(params).body;
}

/** search({kind: "articles"}): individual articles with text. */
export const articlesKind: SearchKind = {
  path: "/article/getArticles",
  aggregates: [
    "timeAggr",
    "sourceAggr",
    "authorAggr",
    "keywordAggr",
    "locAggr",
    "conceptAggr",
    "categoryAggr",
    "sentimentAggr",
    "langAggr",
  ],
  defaultCount: 50,
  maxCount: 100,
  sortBy: [
    "date",
    "rel",
    "sourceImportance",
    "sourceAlexaGlobalRank",
    "socialScore",
    "facebookShares",
  ],
  props: {
    articleBodyLen: responseControlProps.articleBodyLen,
    isDuplicateFilter: {
      type: "string",
      description:
        "\"keepAll\" (default), \"skipDuplicates\" (use for scans), \"keepOnlyDuplicates\".",
      enum: ["keepAll", "skipDuplicates", "keepOnlyDuplicates"],
    },
  },
  optionProps: {
    dataType: {
      type: "string",
      description:
        'Content types, comma-separated: "news" (default), "pr", "blog".',
    },
  },
  unsupported: [],
  bodyLen: (params) => (params.articleBodyLen as number) ?? 1000,
  adapt: (body, params) => {
    if (params.dataType) body.dataType = parseArray(params.dataType);
  },
  includeParams: getArticleIncludeParams,
  formatter: formatArticleResults,
};

export const getArticleDetails: ToolDef = {
  name: "get_article_details",
  description: `Full text, URL and metadata for article URIs (up to 100 per call, 1 API token). Use after a scan; not for searching.
Example: get_article_details({articleUri: ["123", "456"], includeFields: "sentiment"})`,
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

export const articleTools: ToolDef[] = [getArticleDetails];
