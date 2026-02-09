import { apiPost, parseArray } from "../client.js";
import {
  contentFilterProps,
  buildFilterBody,
  includeFieldsProp,
  detailLevelProp,
  applyDetailLevel,
} from "./articles.js";
import type { ToolDef } from "../types.js";
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
NOT THIS when you need full article text — use search_articles instead.
NOT THIS when you have a text passage to match — use find_event_for_text instead.`,
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
        description: "Events per page (max 50). Default: 10.",
        default: 10,
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
    body.eventsCount ??= 10;
    Object.assign(body, getEventIncludeParams(groups));

    const result = await apiPost("/event/getEvents", body);
    return filterResponse(result, { resultType: "events", groups });
  },
  formatter: formatEventResults,
};

export const getEventDetails: ToolDef = {
  name: "get_event_details",
  description: `Get full details for one or more events by their URI(s).

EXAMPLE: get_event_details({eventUri: "eng-4567890", includeFields: "concepts,categories"})

USE THIS WHEN you have event URIs from search results and need full details.
NOT THIS for searching — use search_events with filters instead.`,
  inputSchema: {
    type: "object",
    properties: {
      eventUri: {
        type: "string",
        description: "Event URI(s). Comma-separated for multiple.",
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

    const result = await apiPost("/event/getEvent", apiBody);
    return filterResponse(result, { resultType: "events", groups });
  },
  formatter: formatEventDetails,
};

export const findEventForText: ToolDef = {
  name: "find_event_for_text",
  description: `Match a text passage to a known event in Event Registry. Returns the single most relevant matching event.

EXAMPLE: find_event_for_text({text: "A major earthquake struck central Japan on Monday"})

USE THIS WHEN you have a news snippet or headline and want the corresponding event cluster.
NOT THIS when you have a topic name — use search_events with conceptUri instead.
WORKFLOW: find_event_for_text → get_event_details → search_articles for related coverage.`,
  inputSchema: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "Text to match against known events.",
      },
      ...includeFieldsProp,
    },
    required: ["text"],
  },
  handler: async (params) => {
    const groups = parseFieldGroups(params.includeFields as string | undefined);

    const result = await apiPost("/event/getEvents", {
      keyword: params.text,
      resultType: "events",
      eventsCount: 1,
      eventsSortBy: "rel",
      ...getEventIncludeParams(groups),
    });
    return filterResponse(result, { resultType: "events", groups });
  },
  formatter: formatEventResults,
};

export const eventTools: ToolDef[] = [
  searchEvents,
  getEventDetails,
  findEventForText,
];
