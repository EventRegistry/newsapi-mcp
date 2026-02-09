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

Prefer "concepts" as the default type. Use specific types when entity type is unambiguous (e.g., journalist name → "authors").

TIPS:
- Keep prefix SHORT (1-3 words). The API does prefix matching, not full-text search.
  Good: "Tesla", "Angela Merkel" | Bad: "Tesla electric vehicle company"
- For non-English entities, search in English first. Only try the native language if English returns no results.
  Example: For Slovenian company "Krka", first search with lang="eng", then try lang="slv" if needed.
- For locations, ALWAYS use English names regardless of target language.
  Good: "Germany", "Slovenia" | Bad: "Deutschland", "Slovenija"
- Prefer WELL-ESTABLISHED concepts over year-specific or recent event editions.
  Good: "Winter Olympic Games", "FIFA World Cup" | Bad: "2026 Winter Olympics", "2026 FIFA World Cup"
  If a specific concept returns no results, try a broader parent concept or use keyword search instead.`,
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
        description:
          "Short name or prefix to search for (1-3 words). Shorter prefixes work better than long descriptions.",
      },
      lang: {
        type: "string",
        description:
          'Language code for results (e.g. "eng", "deu", "fra", "slv"). Defaults to "eng". For non-English entities, try English first, then native language if needed. For locations, always use English names.',
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
