import { apiPost } from "../client.js";
import { ApiError } from "../types.js";
import type { ResponseFormatter, ToolDef } from "../types.js";
import { buildSearchBody, queryProp } from "../query.js";
import type { SearchBodyOptions } from "../query.js";
import { parseFieldGroups, filterResponse } from "../response-filter.js";
import { formatAggregate } from "../formatters.js";
import {
  articlesKind,
  contentFilterProps,
  coreFilterProps,
  flattenOptions,
  RARE_FILTER_KEYS,
} from "./articles.js";
import { eventsKind } from "./events.js";
import { mentionsKind } from "./mentions.js";

export type Kind = "articles" | "events" | "mentions";

/** What one `kind` of the search tool adds to the shared filters. */
export interface SearchKind {
  path: string;
  aggregates: readonly string[];
  defaultCount: number;
  maxCount: number;
  sortBy: readonly string[];
  /** Kind-only params exposed at the top level. */
  props: Record<string, unknown>;
  /** Kind-only rare params exposed under `options`. */
  optionProps: Record<string, unknown>;
  /** Shared filters the endpoint does not accept. */
  unsupported: readonly string[];
  searchOptions?: SearchBodyOptions;
  /** Body length to request and keep, when the kind returns article bodies. */
  bodyLen?: (params: Record<string, unknown>) => number;
  /** Endpoint-specific body adjustments after the shared builder ran. */
  adapt?: (body: Record<string, unknown>, params: Record<string, unknown>) => void;
  includeParams: (groups: Set<string>) => Record<string, boolean>;
  formatter: ResponseFormatter;
}

const KINDS: Record<Kind, SearchKind> = {
  articles: articlesKind,
  events: eventsKind,
  mentions: mentionsKind,
};
const KIND_NAMES = Object.keys(KINDS) as Kind[];

/** What each aggregate resultType summarises, for the schema description. */
const AGGREGATE_DESCRIPTIONS: Record<string, string> = {
  timeAggr: "count per day",
  sourceAggr: "top sources",
  authorAggr: "top authors",
  keywordAggr: "top keywords",
  locAggr: "top locations",
  conceptAggr: "top entities",
  categoryAggr: "top categories",
  sentimentAggr: "sentiment distribution",
  langAggr: "count per language",
  eventTypeAggr: "count per event type",
};

/** The generic paging params and the API name each kind uses for them. */
const LIST_PARAMS = ["page", "count", "sortBy", "sortByAsc"] as const;
type ListParam = (typeof LIST_PARAMS)[number];
const apiListName = (kind: Kind, p: ListParam): string =>
  `${kind}${p.charAt(0).toUpperCase()}${p.slice(1)}`;

/** Kinds that accept each kind-restricted key; keys missing here are accepted by all. */
const KEY_KINDS = new Map<string, Kind[]>();
for (const key of Object.keys(contentFilterProps)) {
  const kinds = KIND_NAMES.filter((k) => !KINDS[k].unsupported.includes(key));
  if (kinds.length < KIND_NAMES.length) KEY_KINDS.set(key, kinds);
}
for (const kind of KIND_NAMES) {
  const own = { ...KINDS[kind].props, ...KINDS[kind].optionProps };
  for (const key of Object.keys(own)) {
    KEY_KINDS.set(key, [...(KEY_KINDS.get(key) ?? []), kind]);
  }
}

/** Prefix a param description with the kinds it applies to. */
function tagged(
  prop: unknown,
  kinds: readonly Kind[] | undefined,
): Record<string, unknown> {
  const def = prop as Record<string, unknown>;
  if (!kinds || kinds.length === KIND_NAMES.length) return def;
  return { ...def, description: `${kinds.join("/")} only. ${def.description}` };
}

function taggedProps(props: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(props).map(([k, v]) => [k, tagged(v, KEY_KINDS.get(k))]),
  );
}

function unionOf(pick: (spec: SearchKind) => readonly string[]): string[] {
  return [...new Set(KIND_NAMES.flatMap((k) => pick(KINDS[k])))];
}

/** Lists which kinds offer each value: `"size" (events)`. */
function perKind(
  values: string[],
  pick: (spec: SearchKind) => readonly string[],
  label: (v: string) => string = (v) => `"${v}"`,
): string {
  return values
    .map((v) => {
      const kinds = KIND_NAMES.filter((k) => pick(KINDS[k]).includes(v));
      const tag = kinds.length === KIND_NAMES.length ? "" : ` (${kinds.join("/")})`;
      return `${label(v)}${tag}`;
    })
    .join(", ");
}

const aggregates = unionOf((s) => s.aggregates);
const sortValues = unionOf((s) => s.sortBy);

const optionProperties: Record<string, unknown> = {
  ...taggedProps(
    Object.fromEntries(RARE_FILTER_KEYS.map((k) => [k, contentFilterProps[k]])),
  ),
  ...taggedProps(Object.assign({}, ...KIND_NAMES.map((k) => KINDS[k].optionProps))),
  sortByAsc: {
    type: "boolean",
    description: "Ascending sort order. Default: false.",
  },
};

/** Explain a search that cost more than the 1-token baseline, so the model can avoid repeating it. */
function costNote(kind: Kind, reqTokens: number | undefined): string | undefined {
  if (reqTokens === undefined || reqTokens <= 1) return undefined;
  if (kind === "events" && reqTokens <= 5) {
    return "Event searches cost 5 API tokens; kind \"articles\" costs 1. Do not repeat it with reworded keywords.";
  }
  return `This search cost ${reqTokens} API tokens because its dates reach back more than 31 days. For recent news use forceMaxDataTimeWindow: 31 (1 token) instead of explicit dates.`;
}

export const search: ToolDef = {
  name: "search",
  description: `Search news. kind: "articles" (individual articles with text; 1 API token within 31 days), "events" (clusters of articles about one happening, with summary and article count: use for an overview; 5 tokens), "mentions" (sentences stating a kind of happening such as layoffs or an acquisition, with entities and article link; set eventTypeUri from suggest). Scan articles first with articleBodyLen: 0, count: 100 (one row per article: uri | date | source | title), pick uris, then get_article_details for text and URLs. Resolve names with suggest before using conceptUri.
Example: search({kind: "articles", conceptUri: "<uri>", forceMaxDataTimeWindow: 7, lang: "eng", articleBodyLen: 0, isDuplicateFilter: "skipDuplicates"})`,
  inputSchema: {
    type: "object",
    properties: {
      kind: {
        type: "string",
        description: "What to search.",
        enum: KIND_NAMES,
      },
      ...taggedProps(coreFilterProps),
      ...taggedProps(Object.assign({}, ...KIND_NAMES.map((k) => KINDS[k].props))),
      includeFields: {
        type: "string",
        description:
          "Extra field groups, comma-separated. articles/events: sentiment, concepts, categories, images, authors, location, social, metadata, event, full. mentions: slots (entities in the sentence), categories, frameworks, metadata, full. Default: none.",
      },
      resultType: {
        type: "string",
        description: `The list (default: same as kind) or one aggregate over ALL matches: ${perKind(aggregates, (s) => s.aggregates, (v) => `"${v}" (${AGGREGATE_DESCRIPTIONS[v]})`)}. Aggregates ignore paging, sorting, includeFields and articleBodyLen.`,
        enum: [...KIND_NAMES, ...aggregates],
      },
      page: {
        type: "integer",
        description: "Page number (starting from 1). Default: 1.",
        minimum: 1,
      },
      count: {
        type: "integer",
        description: `Results per page. Default: ${perKind(
          unionOf((s) => [String(s.defaultCount)]),
          (s) => [String(s.defaultCount)],
          (v) => v,
        )}; max ${perKind(
          unionOf((s) => [String(s.maxCount)]),
          (s) => [String(s.maxCount)],
          (v) => v,
        )}. Use 100 for article scans.`,
        minimum: 1,
        maximum: 100,
      },
      sortBy: {
        type: "string",
        description: `${perKind(sortValues, (s) => s.sortBy)}. Default: "date".`,
        enum: sortValues,
      },
      ...queryProp(),
      options: {
        type: "object",
        description:
          "Rare filters as a nested object, e.g. options: {minSentiment: 0.3}.",
        properties: optionProperties,
      },
    },
    required: ["kind"],
  },
  handler: async (raw) => {
    const kind = raw.kind as Kind;
    const spec = KINDS[kind];
    if (!spec) {
      throw new ApiError(400, `kind must be one of: ${KIND_NAMES.join(", ")}.`);
    }
    const params = flattenOptions(raw);
    delete params.kind;

    for (const key of Object.keys(params)) {
      const kinds = KEY_KINDS.get(key);
      if (kinds && !kinds.includes(kind)) {
        throw new ApiError(
          400,
          `"${key}" applies to kind ${kinds.map((k) => `"${k}"`).join("/")} only, not "${kind}".`,
        );
      }
    }
    if (params.sortBy !== undefined && !spec.sortBy.includes(params.sortBy as string)) {
      throw new ApiError(
        400,
        `sortBy "${String(params.sortBy)}" is not available for kind "${kind}"; use ${spec.sortBy.map((v) => `"${v}"`).join(", ")}.`,
      );
    }
    if (typeof params.count === "number" && params.count > spec.maxCount) {
      params.count = spec.maxCount;
    }
    for (const p of LIST_PARAMS) {
      if (params[p] !== undefined) {
        params[apiListName(kind, p)] = params[p];
        delete params[p];
      }
    }

    const resultType = (params.resultType as string) || kind;
    if (resultType !== kind) {
      if (!spec.aggregates.includes(resultType)) {
        throw new ApiError(
          400,
          `resultType "${resultType}" is not available for kind "${kind}"; use "${kind}" or ${spec.aggregates.map((v) => `"${v}"`).join(", ")}.`,
        );
      }
      const { body, notes } = buildSearchBody(params, spec.searchOptions);
      for (const p of LIST_PARAMS) delete body[apiListName(kind, p)];
      body.resultType = resultType;
      spec.adapt?.(body, params);
      return { ...(await apiPost(spec.path, body)), notes };
    }

    params[apiListName(kind, "count")] ??= spec.defaultCount;
    const groups = parseFieldGroups(params.includeFields as string | undefined);
    const bodyLen = spec.bodyLen?.(params);

    const { body, notes } = buildSearchBody(params, spec.searchOptions);
    body.resultType = kind;
    if (bodyLen !== undefined) body.articleBodyLen = bodyLen;
    spec.adapt?.(body, params);
    Object.assign(body, spec.includeParams(groups));

    const { data, tokenUsage } = await apiPost(spec.path, body);
    const cost = costNote(kind, tokenUsage?.reqTokens);
    if (cost) notes.push(cost);
    if (bodyLen !== undefined && bodyLen > 0) {
      notes.push(
        `Bodies cut to ${bodyLen} chars; get_article_details returns full text.`,
      );
    }
    return {
      data: filterResponse(data, { resultType: kind, groups, bodyLen }),
      tokenUsage,
      notes,
    };
  },
  formatter: (data, params) => {
    const kind = params.kind as Kind;
    return params.resultType && params.resultType !== kind
      ? formatAggregate(data, params)
      : KINDS[kind].formatter(data, params);
  },
};

export const searchTools: ToolDef[] = [search];
