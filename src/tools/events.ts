import { apiPost, parseArray } from "../client.js";
import { ApiError } from "../types.js";
import type { ToolDef } from "../types.js";
import { includeFieldsProp } from "./articles.js";
import type { SearchKind } from "./search.js";
import {
  parseFieldGroups,
  getEventIncludeParams,
  filterResponse,
} from "../response-filter.js";
import {
  formatEventResults,
  formatEventDetails,
  mergedEventUri,
} from "../formatters.js";
import type { ApiResponse, TokenUsage } from "../types.js";

/** Articles returned per event when the caller gives no articlesCount. */
const EVENT_ARTICLES_DEFAULT_COUNT = 10;
/** Breaking events that get a top-article lookup; each costs one API call. */
const TOP_ARTICLE_EVENT_LIMIT = 10;

/** Add the sum of a call's tokens to a running total; the latest known "remaining" wins. */
function addTokenUsage(
  total: TokenUsage | undefined,
  next: TokenUsage | undefined,
): TokenUsage | undefined {
  if (!next) return total;
  if (!total) return { ...next };
  return {
    reqTokens: total.reqTokens + next.reqTokens,
    remaining: next.remaining ?? total.remaining,
  };
}

/** Params of the one-article lookup behind includeTopArticleUrl. */
const TOP_ARTICLE_PARAMS = {
  resultType: "articles",
  articlesCount: 1,
  articlesSortBy: "date",
  articlesArticleBodyLen: 0,
};

/** Fetch the newest article of one event: title, source and URL. */
async function fetchTopArticle(
  eventUri: string,
): Promise<{ article?: Record<string, unknown>; tokenUsage?: TokenUsage }> {
  const first = await apiPost("/event/getEvent", {
    eventUri,
    ...TOP_ARTICLE_PARAMS,
  });
  let tokenUsage = first.tokenUsage;
  let entry = (first.data as Record<string, Record<string, unknown>>)?.[
    eventUri
  ];

  // a merged event answers with its new URI only: follow it once
  const target = mergedEventUri(entry);
  if (target) {
    const retry = await apiPost("/event/getEvent", {
      eventUri: target,
      ...TOP_ARTICLE_PARAMS,
    });
    tokenUsage = addTokenUsage(tokenUsage, retry.tokenUsage);
    entry = (retry.data as Record<string, Record<string, unknown>>)?.[target];
  }

  const results = (entry?.articles as Record<string, unknown> | undefined)
    ?.results as Record<string, unknown>[] | undefined;
  const art = results?.[0];
  if (!art) return { tokenUsage };
  return {
    article: {
      title: art.title,
      url: art.url,
      source: (art.source as Record<string, unknown> | undefined)?.title,
    },
    tokenUsage,
  };
}

/**
 * Replace each merged entry of a getEvent answer by the event it was merged
 * into. Asks the API once more for the targets not already in the answer;
 * an entry whose target is missing or merged again stays as it was.
 */
async function followMergedEvents(
  apiBody: Record<string, unknown>,
  first: ApiResponse,
): Promise<ApiResponse> {
  // find the merged entries
  const data = (first.data ?? {}) as Record<string, unknown>;
  const redirects = new Map<string, string>();
  for (const [uri, entry] of Object.entries(data)) {
    const target = mergedEventUri(entry);
    if (target) redirects.set(uri, target);
  }
  if (redirects.size === 0) return first;

  // fetch the targets once, never their own targets
  const isShown = (entry: unknown) =>
    !!entry && typeof entry === "object" && !mergedEventUri(entry);
  const missing = [...new Set(redirects.values())].filter(
    (uri) => !isShown(data[uri]),
  );
  let found = data;
  let tokenUsage = first.tokenUsage;
  if (missing.length > 0) {
    const retry = await apiPost("/event/getEvent", {
      ...apiBody,
      eventUri: Array.isArray(apiBody.eventUri) ? missing : missing[0],
    });
    found = { ...data, ...(retry.data as Record<string, unknown>) };
    tokenUsage = addTokenUsage(tokenUsage, retry.tokenUsage);
  }

  // rebuild the answer in the order asked
  const out: Record<string, unknown> = {};
  const notes: string[] = [];
  for (const [uri, entry] of Object.entries(data)) {
    const target = redirects.get(uri);
    if (target && isShown(found[target])) {
      out[target] = found[target];
      notes.push(`Event ${uri} was merged into ${target}; showing ${target}.`);
    } else {
      out[uri] = entry;
    }
  }
  return { data: out, tokenUsage, notes: notes.length ? notes : undefined };
}

/** Strip each event's articles like a search result: { "<uri>": { articles: {...} } }. */
function filterEventArticles(
  data: unknown,
  groups: Set<string>,
  apiBody: Record<string, unknown>,
): unknown {
  if (!data || typeof data !== "object") return data;
  const out: Record<string, unknown> = {};
  for (const [uri, entry] of Object.entries(data as Record<string, unknown>)) {
    out[uri] =
      entry && typeof entry === "object"
        ? filterResponse(entry, {
            resultType: "articles",
            groups,
            bodyLen: apiBody.articlesArticleBodyLen as number,
          })
        : entry;
  }
  return out;
}

/** The events API names the sentiment filters differently. */
function adaptEventFilters(body: Record<string, unknown>): void {
  if (body.minSentiment !== undefined) {
    body.minSentimentEvent = body.minSentiment;
    delete body.minSentiment;
  }
  if (body.maxSentiment !== undefined) {
    body.maxSentimentEvent = body.maxSentiment;
    delete body.maxSentiment;
  }
}

/** search({kind: "events"}): clusters of articles about one happening. */
export const eventsKind: SearchKind = {
  path: "/event/getEvents",
  aggregates: [
    "timeAggr",
    "locAggr",
    "sourceAggr",
    "authorAggr",
    "keywordAggr",
    "conceptAggr",
    "categoryAggr",
    "sentimentAggr",
  ],
  defaultCount: 50,
  maxCount: 50,
  sortBy: ["date", "rel", "size", "socialScore"],
  props: {
    minArticlesInEvent: {
      type: "integer",
      description: "Minimum number of articles in the event.",
    },
  },
  optionProps: {
    maxArticlesInEvent: {
      type: "integer",
      description: "Maximum number of articles in the event.",
    },
    reportingDateStart: {
      type: "string",
      description: "Average article publishing date >= this (YYYY-MM-DD).",
    },
    reportingDateEnd: {
      type: "string",
      description: "Average article publishing date <= this (YYYY-MM-DD).",
    },
  },
  unsupported: ["startSourceRankPercentile", "endSourceRankPercentile"],
  adapt: adaptEventFilters,
  includeParams: getEventIncludeParams,
  formatter: formatEventResults,
};

export const getBreakingEvents: ToolDef = {
  name: "get_breaking_events",
  description: `List the events breaking right now: very recent, many articles in a short time, and coverage still accelerating. Each entry carries a breaking score. No query needed.

EXAMPLE: get_breaking_events({})
EXAMPLE: get_breaking_events({breakingEventsCount: 10, breakingEventsMinBreakingScore: 0.5})
EXAMPLE (citable): get_breaking_events({breakingEventsCount: 10, includeTopArticleUrl: true})

Events carry no article URLs. includeTopArticleUrl: true adds the newest article (title, source, URL) under each of the first ${TOP_ARTICLE_EVENT_LIMIT} events, one extra API call (5 tokens) per event.

USE THIS WHEN the user asks what is happening now or wants today's biggest stories without naming a topic.
NOT THIS for a specific topic — use search({kind: "events"}) with filters instead.`,
  inputSchema: {
    type: "object",
    properties: {
      ...includeFieldsProp,
      breakingEventsCount: {
        type: "integer",
        description: "Events per page (max 100). Default: 50.",
        minimum: 1,
        maximum: 100,
      },
      breakingEventsPage: {
        type: "integer",
        description: "Page number (starting from 1). Default: 1.",
        minimum: 1,
      },
      breakingEventsMinBreakingScore: {
        type: "number",
        description:
          "Lowest breaking score to include (0 or more). Default: 0.2. Raise it to keep only the strongest stories.",
        minimum: 0,
      },
      includeTopArticleUrl: {
        type: "boolean",
        description: `Attach the newest article (title, source, URL) to each of the first ${TOP_ARTICLE_EVENT_LIMIT} events so they can be cited. Default: false.`,
      },
    },
  },
  handler: async (params) => {
    const groups = parseFieldGroups(params.includeFields as string | undefined);
    const body: Record<string, unknown> = {
      breakingEventsCount: params.breakingEventsCount ?? 50,
      breakingEventsPage: params.breakingEventsPage ?? 1,
      breakingEventsMinBreakingScore:
        params.breakingEventsMinBreakingScore ?? 0.2,
      ...getEventIncludeParams(groups),
    };

    const { data, tokenUsage } = await apiPost(
      "/event/getBreakingEvents",
      body,
    );
    const filtered = filterResponse(data, {
      resultType: "breakingEvents",
      groups,
    }) as Record<string, unknown>;
    if (!params.includeTopArticleUrl) return { data: filtered, tokenUsage };

    const results = (
      filtered.breakingEvents as Record<string, unknown> | undefined
    )?.results as Record<string, unknown>[] | undefined;
    let usage = tokenUsage;
    for (const evt of (results ?? []).slice(0, TOP_ARTICLE_EVENT_LIMIT)) {
      if (typeof evt.uri !== "string") continue;
      const top = await fetchTopArticle(evt.uri);
      if (top.article) evt.topArticle = top.article;
      usage = addTokenUsage(usage, top.tokenUsage);
    }
    return { data: filtered, tokenUsage: usage };
  },
  formatter: formatEventResults,
};

export const getEventDetails: ToolDef = {
  name: "get_event_details",
  description: `Get full details for one or more events by their URI(s).

EXAMPLE: get_event_details({eventUri: "eng-4567890", includeFields: "concepts,categories"})
EXAMPLE (multiple): get_event_details({eventUri: ["eng-4567890", "eng-1234567"]})
EXAMPLE (articles): get_event_details({eventUri: "eng-4567890", resultType: "articles", articlesCount: 10})

USE THIS WHEN you have event URIs from search results and need full details, or the articles (with URLs) behind one event.
NOT THIS for searching — use search({kind: "events"}) with filters instead.
COST: "info" costs 20 API tokens per call however many URIs it carries, so batch every URI into one call; "articles" costs 5 and returns one compact row per article with its URL (articlesArticleBodyLen: 0, the default).`,
  inputSchema: {
    type: "object",
    properties: {
      eventUri: {
        oneOf: [
          { type: "string" },
          { type: "array", items: { type: "string" } },
        ],
        description:
          'Event URI or array of URIs. Also accepts comma-separated string. Array/multiple URIs only supported with resultType "info" (default).',
      },
      resultType: {
        type: "string",
        description:
          'Result type: "info" (default), "articles", "articleUris", "keywordAggr", "sourceExAggr", "dateMentionAggr", "articleTrend", "similarEvents". When resultType is "info", eventUri can be a string or array. For all other types, eventUri must be a single string.',
        enum: [
          "info",
          "articles",
          "articleUris",
          "keywordAggr",
          "sourceExAggr",
          "dateMentionAggr",
          "articleTrend",
          "similarEvents",
        ],
      },
      articlesCount: {
        type: "integer",
        description:
          'Articles per page when resultType is "articles" (max 100). Default: 10.',
        minimum: 1,
        maximum: 100,
      },
      articlesPage: {
        type: "integer",
        description:
          'Page of articles when resultType is "articles" (starting from 1). Default: 1.',
        minimum: 1,
      },
      articlesSortBy: {
        type: "string",
        description:
          'Order of the articles when resultType is "articles". Default: "date".',
        enum: ["date", "rel", "sourceImportance", "socialScore"],
      },
      articlesArticleBodyLen: {
        type: "integer",
        description:
          'Body characters per article when resultType is "articles": 0 for title, source, date and URL only (default), -1 for the full text.',
      },
      ...includeFieldsProp,
    },
    required: ["eventUri"],
  },
  handler: async (params) => {
    const groups = parseFieldGroups(params.includeFields as string | undefined);
    const resultType = (params.resultType as string) || "info";

    const apiBody: Record<string, unknown> = {
      resultType,
      ...getEventIncludeParams(groups),
    };

    if (resultType === "info") {
      apiBody.eventUri = parseArray(params.eventUri);
    } else {
      const uris = parseArray(params.eventUri) ?? [];
      if (uris.length > 1) {
        throw new ApiError(
          400,
          `resultType "${resultType}" only supports a single eventUri, got ${uris.length}. Use resultType "info" for multiple URIs.`,
        );
      }
      apiBody.eventUri = uris[0];
    }
    if (resultType === "articles") {
      apiBody.articlesCount =
        params.articlesCount ?? EVENT_ARTICLES_DEFAULT_COUNT;
      apiBody.articlesPage = params.articlesPage ?? 1;
      apiBody.articlesSortBy = params.articlesSortBy ?? "date";
      apiBody.articlesArticleBodyLen = params.articlesArticleBodyLen ?? 0;
    }

    const { data, tokenUsage, notes } = await followMergedEvents(
      apiBody,
      await apiPost("/event/getEvent", apiBody),
    );

    if (resultType === "info") {
      return {
        data: filterResponse(data, { resultType: "events", groups }),
        tokenUsage,
        notes,
      };
    }
    if (resultType === "articles") {
      return {
        data: filterEventArticles(data, groups, apiBody),
        tokenUsage,
        notes,
      };
    }
    return { data, tokenUsage, notes };
  },
  formatter: formatEventDetails,
};

export const eventTools: ToolDef[] = [getEventDetails, getBreakingEvents];
