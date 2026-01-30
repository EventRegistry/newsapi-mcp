import { apiPost } from "../client.js";
import type { ToolDef } from "../types.js";

function suggestTool(name: string, description: string, path: string): ToolDef {
  return {
    name,
    description,
    inputSchema: {
      type: "object",
      properties: {
        prefix: {
          type: "string",
          description: "Full or partial name to search for",
        },
      },
      required: ["prefix"],
    },
    handler: async (params) => {
      return apiPost(path, { prefix: params.prefix });
    },
  };
}

export const suggestTools: ToolDef[] = [
  suggestTool(
    "suggest_concepts",
    "Look up concept URIs by name. Use this to find the URI for a person, organization, location, or thing before using it in search filters.",
    "/suggestConceptsFast",
  ),
  suggestTool(
    "suggest_categories",
    "Look up category URIs by name. Use this to find the URI for a news category before using it in search filters.",
    "/suggestCategoriesFast",
  ),
  suggestTool(
    "suggest_sources",
    "Look up news source URIs by name. Use this to find the URI for a news source before using it in search filters.",
    "/suggestSourcesFast",
  ),
  suggestTool(
    "suggest_locations",
    "Look up location URIs by name. Use this to find the URI for a country, city, or place before using it in search filters.",
    "/suggestLocationsFast",
  ),
  suggestTool(
    "suggest_authors",
    "Look up author URIs by name. Use this to find the URI for a journalist or author before using it in search filters.",
    "/suggestAuthorsFast",
  ),
  suggestTool(
    "suggest_event_types",
    "Look up event type URIs by name. Event types are relations like mergers, layoffs, product launches, natural disasters. Use this to find URIs for the search_mentions tool.",
    "/suggestEventTypes",
  ),
];
