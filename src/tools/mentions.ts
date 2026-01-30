import { apiPost, parseArray } from "../client.js";
import { contentFilterProps, buildFilterBody } from "./articles.js";
import type { ToolDef } from "../types.js";

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
    return apiPost("/article/getMentions", body);
  },
};

export const mentionTools: ToolDef[] = [searchMentions];
