import { apiPost, parseArray } from "../client.js";
import {
  contentFilterProps,
  buildFilterBody,
  includeFieldsProp,
} from "./articles.js";
import type { ToolDef } from "../types.js";
import {
  parseFieldGroups,
  getMentionIncludeParams,
  filterResponse,
} from "../response-filter.js";

export const searchMentions: ToolDef = {
  name: "search_mentions",
  description:
    "Search sentence-level mentions of specific event types (relations like mergers, layoffs, product launches, natural disasters). Returns up to 100 mentions per call. Use suggest_event_types to look up event type URIs first.",
  inputSchema: {
    type: "object",
    properties: {
      eventTypeUri: {
        type: "string",
        description:
          "Event type URI(s) to filter by (comma-separated). Use suggest_event_types to look up URIs.",
      },
      ...contentFilterProps,
      ...includeFieldsProp,
      industryUri: {
        type: "string",
        description:
          'Company industry URI(s) (comma-separated, e.g. "sectors/Transportation").',
      },
      sdgUri: {
        type: "string",
        description:
          'UN Sustainable Development Goal URI(s) (e.g. "sdg/sdg5_gender_equality").',
      },
      sasbUri: {
        type: "string",
        description:
          'SASB Materiality Map URI(s) (e.g. "sasb/environment/air_quality").',
      },
      esgUri: {
        type: "string",
        description: 'ESG category URI(s) (e.g. "esg/environment").',
      },
      factLevel: {
        type: "string",
        description:
          'Factuality filter (comma-separated): "fact", "opinion", "forecast".',
      },
      mentionsPage: {
        type: "integer",
        description: "Page number (starting from 1). Default: 1.",
      },
      mentionsCount: {
        type: "integer",
        description: "Mentions per page (max 100). Default: 100.",
        default: 100,
        maximum: 100,
      },
      mentionsSortBy: {
        type: "string",
        description:
          'Sort by: "date", "rel", "sourceImportance". Default: "date".',
        enum: [
          "date",
          "rel",
          "sourceImportance",
          "sourceAlexaGlobalRank",
          "sourceAlexaCountryRank",
        ],
      },
    },
  },
  handler: async (params) => {
    const groups = parseFieldGroups(params.includeFields as string | undefined);

    const body = buildFilterBody(params);
    body.resultType = "mentions";
    // Handle mention-specific array fields
    for (const field of [
      "eventTypeUri",
      "industryUri",
      "sdgUri",
      "sasbUri",
      "esgUri",
      "factLevel",
    ]) {
      if (params[field]) {
        body[field] = parseArray(params[field]);
      }
    }
    Object.assign(body, getMentionIncludeParams(groups));

    const result = await apiPost("/article/getMentions", body);
    return filterResponse(result, { resultType: "mentions", groups });
  },
};

export const mentionTools: ToolDef[] = [searchMentions];
