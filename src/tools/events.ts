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
import { formatEventResults, formatEventDetails } from "../formatters.js";

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
    return {
      data: filterResponse(data, { resultType: "breakingEvents", groups }),
      tokenUsage,
    };
  },
  formatter: formatEventResults,
};

export const getEventDetails: ToolDef = {
  name: "get_event_details",
  description: `Get full details for one or more events by their URI(s).

EXAMPLE: get_event_details({eventUri: "eng-4567890", includeFields: "concepts,categories"})
EXAMPLE (multiple): get_event_details({eventUri: ["eng-4567890", "eng-1234567"]})
EXAMPLE (articles): get_event_details({eventUri: "eng-4567890", resultType: "articles"})

USE THIS WHEN you have event URIs from search results and need full details.
NOT THIS for searching — use search({kind: "events"}) with filters instead.`,
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

    const { data, tokenUsage } = await apiPost("/event/getEvent", apiBody);

    const filtered =
      resultType === "info"
        ? filterResponse(data, { resultType: "events", groups })
        : data;

    return { data: filtered, tokenUsage };
  },
  formatter: formatEventDetails,
};

export const eventTools: ToolDef[] = [getEventDetails, getBreakingEvents];
