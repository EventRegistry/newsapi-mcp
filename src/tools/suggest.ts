import { apiPost } from "../client.js";
import type { ResponseFormatter, ToolDef } from "../types.js";
import {
  formatSuggestAuthors,
  formatSuggestCategories,
  formatSuggestConcepts,
  formatSuggestLocations,
  formatSuggestSources,
} from "../formatters.js";

function suggestTool(
  name: string,
  description: string,
  path: string,
  formatter: ResponseFormatter,
): ToolDef {
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
        lang: {
          type: "string",
          description:
            'Language code for results (e.g. "eng", "deu", "fra"). Defaults to "eng".',
        },
      },
      required: ["prefix"],
    },
    handler: async (params) => {
      return apiPost(path, {
        prefix: params.prefix,
        lang: params.lang ?? "eng",
      });
    },
    formatter,
  };
}

export const suggestTools: ToolDef[] = [
  suggestTool(
    "suggest_concepts",
    "Look up concept URIs by name. Use this to find the URI for a person, organization, location, or thing before using it in search filters.",
    "/suggestConceptsFast",
    formatSuggestConcepts,
  ),
  suggestTool(
    "suggest_categories",
    "Look up category URIs by name. Use this to find the URI for a news category before using it in search filters.",
    "/suggestCategoriesFast",
    formatSuggestCategories,
  ),
  suggestTool(
    "suggest_sources",
    "Look up news source URIs by name. Use this to find the URI for a news source before using it in search filters.",
    "/suggestSourcesFast",
    formatSuggestSources,
  ),
  suggestTool(
    "suggest_locations",
    "Look up location URIs by name. Use this to find the URI for a country, city, or place before using it in search filters.",
    "/suggestLocationsFast",
    formatSuggestLocations,
  ),
  suggestTool(
    "suggest_authors",
    "Look up author URIs by name. Use this to find the URI for a journalist or author before using it in search filters.",
    "/suggestAuthorsFast",
    formatSuggestAuthors,
  ),
];
