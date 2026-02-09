import { LRUCache } from "../cache.js";
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

// Module-level cache: 1000 entries, 24h TTL
const suggestCache = new LRUCache<unknown>(1000, 24);

function cacheKey(type: string, prefix: string, lang: string): string {
  return `${type}:${prefix.toLowerCase()}:${lang}`;
}

// Exported for testing
export function clearSuggestCache(): void {
  suggestCache.clear();
}

export function getSuggestCacheSize(): number {
  return suggestCache.size;
}

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
    const prefix = params.prefix as string;
    const lang = (params.lang as string) ?? "eng";
    const path = SUGGEST_PATHS[type];

    const key = cacheKey(type, prefix, lang);
    const cached = suggestCache.get(key);
    if (cached !== null) {
      return cached;
    }

    const result = await apiPost(path!, { prefix, lang });
    suggestCache.set(key, result);
    return result;
  },
  formatter: (data, params) => {
    const type = params.type as string;
    const formatter = SUGGEST_FORMATTERS[type];
    return formatter!(data, params);
  },
};

export const suggestTools: ToolDef[] = [suggest];
