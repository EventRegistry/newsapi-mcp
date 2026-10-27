import { apiPost } from "../client.js";
import type { ResponseFormatter, ToolDef } from "../types.js";
import {
  formatSuggestAuthors,
  formatSuggestCategories,
  formatSuggestConcepts,
  formatSuggestEventTypes,
  formatSuggestLocations,
  formatSuggestSources,
  formatSuggestSourceGroups,
} from "../formatters.js";

const SUGGEST_TYPES = [
  "concepts",
  "categories",
  "sources",
  "locations",
  "authors",
  "eventTypes",
  "sourceGroups",
] as const;

const SUGGEST_PATHS: Record<string, string> = {
  concepts: "/suggestConceptsFast",
  categories: "/suggestCategoriesFast",
  sources: "/suggestSourcesFast",
  locations: "/suggestLocationsFast",
  authors: "/suggestAuthorsFast",
  eventTypes: "/eventType/suggestEventTypes",
  sourceGroups: "/suggestSourceGroups",
};

const SOURCE_GROUP_COUNT = 100;

/** Identifier kinds the API accepts in place of a label language. */
const ID_TYPES = ["isin", "ticker"] as const;

/** Lookups that take a prefix only, no language. */
const PREFIX_ONLY = new Set(["eventTypes", "sourceGroups"]);

const SUGGEST_FORMATTERS: Record<string, ResponseFormatter> = {
  concepts: formatSuggestConcepts,
  categories: formatSuggestCategories,
  sources: formatSuggestSources,
  locations: formatSuggestLocations,
  authors: formatSuggestAuthors,
  eventTypes: formatSuggestEventTypes,
  sourceGroups: formatSuggestSourceGroups,
};

export const suggest: ToolDef = {
  name: "suggest",
  description: `Resolve a name to the URI the search filters need (free). Types: concepts (people, orgs, things → conceptUri), categories, sources, locations (→ locationUri / sourceLocationUri), authors, eventTypes (→ eventTypeUri for kind: "mentions"), sourceGroups (curated source lists → sourceGroupUri / ignoreSourceGroupUri; an empty prefix lists them). Keep the prefix short (1-3 words), use English names, prefer established concepts ("Olympic Games", not "2026 Olympics"). A stock ticker or ISIN resolves to the company with idType, never as a name.
Examples: suggest({type: "concepts", prefix: "Tesla"}); suggest({type: "concepts", prefix: "AAPL", idType: "ticker"})`,
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
          'Language of the name, default "eng"; try the native language only if English finds nothing. Not with idType.',
      },
      idType: {
        type: "string",
        description:
          'The prefix is a company identifier, not a name (concepts only): "isin" for an ISIN (US0378331005 → Apple Inc.), "ticker" for a bare stock ticker (AAPL → Apple Inc.; not NASDAQ:AAPL, AAPL.O or $AAPL). Results are prefix matches: take the row whose label equals the identifier.',
        enum: [...ID_TYPES],
      },
    },
    required: ["type", "prefix"],
  },
  handler: async (params) => {
    const type = params.type as string;
    const prefix = params.prefix as string;
    const idType = params.idType as (typeof ID_TYPES)[number] | undefined;
    const path = SUGGEST_PATHS[type];
    if (!path) {
      throw new Error(
        `Unknown suggest type: "${type}". Valid: ${SUGGEST_TYPES.join(", ")}`,
      );
    }
    if (idType !== undefined) {
      if (type !== "concepts") {
        throw new Error(`idType "${idType}" applies to type "concepts" only, not "${type}".`);
      }
      if (params.lang !== undefined) {
        throw new Error(`idType "${idType}" and lang "${params.lang}" cannot be combined`);
      }
    }
    // The API models identifier lookups as languages of the concept label.
    const lang = idType ?? (params.lang as string) ?? "eng";

    const body = PREFIX_ONLY.has(type) ? { prefix } : { prefix, lang };
    // The group catalog has ~60 entries; the API default of 20 would cut an empty-prefix listing.
    if (type === "sourceGroups") Object.assign(body, { count: SOURCE_GROUP_COUNT });
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
