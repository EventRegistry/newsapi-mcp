import { apiPost, parseArray } from "../client.js";
import type { ToolDef } from "../types.js";
import {
  contentFilterProps,
  buildFilterBody,
  includeFieldsProp,
  detailLevelProp,
  applyDetailLevel,
} from "./articles.js";
import {
  parseFieldGroups,
  getEventIncludeParams,
  filterResponse,
} from "../response-filter.js";
import { formatEventResults, formatEventDetails } from "../formatters.js";

export const searchEvents: ToolDef = {
  name: "search_events",
  description: `Search events (clusters of related articles about the same real-world happening). Returns up to 50 events per call.

WORKFLOW: Use suggest tool first to resolve names to URIs, then search with conceptUri.
EXAMPLE: search_events({conceptUri: "<uri>", dateStart: "2025-01-01"})

USE THIS WHEN you need a high-level overview of what happened (event summaries, article counts).
NOT THIS when you need full article text — use search_articles instead.`,
  inputSchema: {
    type: "object",
    properties: {
      ...contentFilterProps,
      ...includeFieldsProp,
      ...detailLevelProp,
      minArticlesInEvent: {
        type: "integer",
        description: "Minimum number of articles in the event.",
      },
      maxArticlesInEvent: {
        type: "integer",
        description: "Maximum number of articles in the event.",
      },
      reportingDateStart: {
        type: "string",
        description:
          "Filter by average article publishing date >= this (YYYY-MM-DD).",
      },
      reportingDateEnd: {
        type: "string",
        description:
          "Filter by average article publishing date <= this (YYYY-MM-DD).",
      },
      eventsPage: {
        type: "integer",
        description: "Page number (starting from 1). Default: 1.",
      },
      eventsCount: {
        type: "integer",
        description: "Events per page (max 50). Default set by detailLevel.",
        maximum: 50,
      },
      eventsSortBy: {
        type: "string",
        description:
          'Sort by: "date", "rel", "size", "socialScore". Default: "date".',
        enum: ["date", "rel", "size", "socialScore"],
      },
      eventsSortByAsc: {
        type: "boolean",
        description: "Ascending sort order. Default: false.",
      },
      query: {
        type: ["object", "string"],
        description:
          "Advanced Query Language object for complex boolean logic.",
      },
    },
  },
  handler: async (params) => {
    applyDetailLevel(params);
    const groups = parseFieldGroups(params.includeFields as string | undefined);

    const body = buildFilterBody(params);
    body.resultType = "events";

    // Rename sentiment params for events API (different param names)
    if (body.minSentiment !== undefined) {
      body.minSentimentEvent = body.minSentiment;
      delete body.minSentiment;
    }
    if (body.maxSentiment !== undefined) {
      body.maxSentimentEvent = body.maxSentiment;
      delete body.maxSentiment;
    }
    // Strip article-only params not supported by events API
    delete body.startSourceRankPercentile;
    delete body.endSourceRankPercentile;

    Object.assign(body, getEventIncludeParams(groups));

    const { data, tokenUsage } = await apiPost("/event/getEvents", body);
    return {
      data: filterResponse(data, { resultType: "events", groups }),
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

USE THIS WHEN you have event URIs from search results and need full details.
NOT THIS for searching — use search_events with filters instead.`,
  inputSchema: {
    type: "object",
    properties: {
      eventUri: {
        oneOf: [
          { type: "string" },
          { type: "array", items: { type: "string" } },
        ],
        description:
          "Event URI or array of URIs. Also accepts comma-separated string.",
      },
      ...includeFieldsProp,
    },
    required: ["eventUri"],
  },
  handler: async (params) => {
    const groups = parseFieldGroups(params.includeFields as string | undefined);

    const uris = parseArray(params.eventUri);
    const apiBody: Record<string, unknown> = {
      eventUri: uris,
      ...getEventIncludeParams(groups),
    };

    const { data, tokenUsage } = await apiPost("/event/getEvent", apiBody);
    return {
      data: filterResponse(data, { resultType: "events", groups }),
      tokenUsage,
    };
  },
  formatter: formatEventDetails,
};

export const eventTools: ToolDef[] = [searchEvents, getEventDetails];
