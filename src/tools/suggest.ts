import { apiPost } from "../client.js";
import type { ResponseFormatter, ToolDef } from "../types.js";
import {
  formatSuggestAuthors,
  formatSuggestCategories,
  formatSuggestConcepts,
  formatSuggestLocations,
  formatSuggestSources,
} from "../formatters.js";

const SUGGEST_TYPES = [
  "concepts",
  "categories",
  "sources",
  "locations",
  "authors",
] as const;

const SUGGEST_PATHS: Record<string, string> = {
  concepts: "/suggestConceptsFast",
  categories: "/suggestCategoriesFast",
  sources: "/suggestSourcesFast",
  locations: "/suggestLocationsFast",
  authors: "/suggestAuthorsFast",
};

const SUGGEST_FORMATTERS: Record<string, ResponseFormatter> = {
  concepts: formatSuggestConcepts,
  categories: formatSuggestCategories,
  sources: formatSuggestSources,
  locations: formatSuggestLocations,
  authors: formatSuggestAuthors,
};

export const suggest: ToolDef = {
  name: "suggest",
  description: `Look up URIs for entities by name. You MUST resolve names to URIs before using them in search filters.

TYPES:
- "concepts": people, orgs, locations, things → for conceptUri
- "categories": news topics (business, tech, sports) → for categoryUri
- "sources": news outlets (Reuters, BBC) → for sourceUri
- "locations": countries, cities, regions → for locationUri or sourceLocationUri
- "authors": journalists → for authorUri

WORKFLOW: suggest(type, prefix) → get URI → pass to search_articles or search_events.
EXAMPLE: suggest({type: "concepts", prefix: "Tesla"}) → search_articles({conceptUri: "<uri>"})

Prefer "concepts" as the default type. Use specific types when entity type is unambiguous (e.g., journalist name → "authors").`,
  inputSchema: {
    type: "object",
    properties: {
      type: {
        type: "string",
        description:
          'Entity type to look up: "concepts" (people, orgs, things), "categories" (news topics), "sources" (news outlets), "locations" (countries, cities), "authors" (journalists).',
        enum: [...SUGGEST_TYPES],
      },
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
    required: ["type", "prefix"],
  },
  handler: async (params) => {
    const type = params.type as string;
    const path = SUGGEST_PATHS[type];
    return apiPost(path, {
      prefix: params.prefix,
      lang: params.lang ?? "eng",
    });
  },
  formatter: (data, params) => {
    const type = params.type as string;
    return SUGGEST_FORMATTERS[type](data, params);
  },
};

export const suggestTools: ToolDef[] = [suggest];
