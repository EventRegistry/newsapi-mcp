import { apiPost, parseArray } from "../client.js";
import { contentFilterProps, buildFilterBody } from "./articles.js";
import type { ToolDef } from "../types.js";

export const searchEvents: ToolDef = {
  name: "search_events",
  description:
    "Search events (clusters of related articles about the same real-world happening). Returns up to 50 events per call. Use suggest_* tools first to look up URIs.",
  inputSchema: {
    type: "object",
    properties: {
      ...contentFilterProps,
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
        description: "Events per page (max 50). Default: 50.",
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
    const body = buildFilterBody(params);
    body.resultType = "events";
    return apiPost("/event/getEvents", body);
  },
};

export const getEventDetails: ToolDef = {
  name: "get_event_details",
  description: "Get full details for one or more events by their URI(s).",
  inputSchema: {
    type: "object",
    properties: {
      eventUri: {
        type: "string",
        description: "Event URI(s). Comma-separated for multiple.",
      },
    },
    required: ["eventUri"],
  },
  handler: async (params) => {
    const uris = parseArray(params.eventUri);
    return apiPost("/event/getEvent", { eventUri: uris });
  },
};

export const getBreakingEvents: ToolDef = {
  name: "get_breaking_events",
  description:
    "Get currently trending/breaking events. No required parameters.",
  inputSchema: {
    type: "object",
    properties: {},
  },
  handler: async () => {
    return apiPost("/event/getBreakingEvents", {});
  },
};

export const streamEvents: ToolDef = {
  name: "stream_events",
  description:
    "Get recently added or updated events (real-time stream). Use recentActivityEventsUpdatesAfterUri for deduplication between calls.",
  inputSchema: {
    type: "object",
    properties: {
      recentActivityEventsMaxEventCount: {
        type: "integer",
        description: "Max events to return. Default: 50.",
      },
      recentActivityEventsUpdatesAfterUri: {
        type: "string",
        description:
          "Only return events updated after this URI. Recommended for deduplication.",
      },
      recentActivityEventsUpdatesAfterMinsAgo: {
        type: "integer",
        description: "Return events from the last N minutes (max 240).",
      },
    },
  },
  handler: async (params) => {
    const body: Record<string, unknown> = {
      resultType: "recentActivityEvents",
    };
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) body[k] = v;
    }
    return apiPost("/minuteStreamEvents", body);
  },
};

export const findEventForText: ToolDef = {
  name: "find_event_for_text",
  description:
    "Match a text passage to a known event in Event Registry. Returns the most relevant matching event.",
  inputSchema: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "Text to match against known events.",
      },
    },
    required: ["text"],
  },
  handler: async (params) => {
    return apiPost("/event/getEventForText", { text: params.text });
  },
};

export const eventTools: ToolDef[] = [
  searchEvents,
  getEventDetails,
  getBreakingEvents,
  streamEvents,
  findEventForText,
];
