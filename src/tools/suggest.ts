import { apiPost } from "../client.js";
import type { ResponseFormatter, ToolDef } from "../types.js";
import {
  formatSuggestAuthors,
  formatSuggestCategories,
  formatSuggestConcepts,
  formatSuggestEventTypes,
  formatSuggestLocations,
  formatSuggestSources,
} from "../formatters.js";

const SUGGEST_TYPES = [
  "concepts",
  "categories",
  "sources",
  "locations",
  "authors",
  "eventTypes",
] as const;

const SUGGEST_PATHS: Record<string, string> = {
  concepts: "/suggestConceptsFast",
  categories: "/suggestCategoriesFast",
  sources: "/suggestSourcesFast",
  locations: "/suggestLocationsFast",
  authors: "/suggestAuthorsFast",
  eventTypes: "/eventType/suggestEventTypes",
};

/** Lookups that take a prefix only, no language. */
const PREFIX_ONLY = new Set(["eventTypes"]);

const SUGGEST_FORMATTERS: Record<string, ResponseFormatter> = {
  concepts: formatSuggestConcepts,
  categories: formatSuggestCategories,
  sources: formatSuggestSources,
  locations: formatSuggestLocations,
  authors: formatSuggestAuthors,
  eventTypes: formatSuggestEventTypes,
};

export const suggest: ToolDef = {
  name: "suggest",
  description: `Resolve a name to the URI the search filters need (free). Types: concepts (people, orgs, things → conceptUri), categories, sources, locations (→ locationUri / sourceLocationUri), authors, eventTypes (→ eventTypeUri, search_mentions only). Keep the prefix short (1-3 words), use English names, prefer established concepts ("Olympic Games", not "2026 Olympics").
Example: suggest({type: "concepts", prefix: "Tesla"})`,
  inputSchema: {
    type: "object",
    properties: {
      type: {
        type: "string",
        description: "What to look up.",
        enum: [...SUGGEST_TYPES],
      },
      prefix: {
        type: "string",
        description: "Name or prefix, 1-3 words.",
      },
      lang: {
        type: "string",
        description:
          'Language of the name, default "eng"; try the native language only if English finds nothing.',
      },
    },
    required: ["type", "prefix"],
  },
  handler: async (params) => {
    const type = params.type as string;
    const prefix = params.prefix as string;
    const lang = (params.lang as string) ?? "eng";
    const path = SUGGEST_PATHS[type];
    if (!path) {
      throw new Error(
        `Unknown suggest type: "${type}". Valid: ${SUGGEST_TYPES.join(", ")}`,
      );
    }

    const body = PREFIX_ONLY.has(type) ? { prefix } : { prefix, lang };
    const { data, tokenUsage } = await apiPost(path, body);
    return { data, tokenUsage: tokenUsage ?? { reqTokens: 0, remaining: 0 } };
  },
  formatter: (data, params) => {
    const type = params.type as string;
    const formatter = SUGGEST_FORMATTERS[type];
    if (!formatter) return JSON.stringify(data);
    return formatter(data, params);
  },
};

export const suggestTools: ToolDef[] = [suggest];
