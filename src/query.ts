/**
 * Builds the search request body from tool params: expands comma lists,
 * composes flat filters with an advanced `query`, and applies the defaults
 * that keep a search cheap (a bounded date window, boolean keyword mode).
 */
import { parseArray } from "./client.js";
import { ApiError } from "./types.js";

/** Comma-separated params the API takes as arrays. */
const ARRAY_FIELDS = new Set([
  "keyword",
  "conceptUri",
  "categoryUri",
  "sourceUri",
  "sourceLocationUri",
  "authorUri",
  "locationUri",
  "lang",
  "ignoreKeyword",
  "ignoreConceptUri",
  "ignoreCategoryUri",
  "ignoreSourceUri",
  "ignoreSourceLocationUri",
  "ignoreSourceGroupUri",
  "ignoreAuthorUri",
  "ignoreLocationUri",
  "ignoreLang",
  "sourceGroupUri",
  "eventTypeUri",
  "industryUri",
  "sdgUri",
  "sasbUri",
  "esgUri",
  "factLevel",
  "ignoreEventTypeUri",
  "ignoreIndustryUri",
  "ignoreSdgUri",
  "ignoreSasbUri",
  "ignoreEsgUri",
]);

/** Params the server consumes itself and never sends. */
const LOCAL_PARAMS = new Set(["includeFields", "articleBodyLen"]);

/** Flat filters that become one extra leaf of an advanced query (implicit AND). */
const QUERY_LEAF_KEYS = [
  "keyword",
  "keywordLoc",
  "keywordSearchMode",
  "conceptUri",
  "categoryUri",
  "sourceUri",
  "sourceLocationUri",
  "sourceGroupUri",
  "authorUri",
  "locationUri",
  "lang",
  "dateStart",
  "dateEnd",
  "eventTypeUri",
  "industryUri",
  "sdgUri",
  "sasbUri",
  "esgUri",
  "minArticlesInEvent",
  "maxArticlesInEvent",
] as const;

/** Flat filters that belong in the advanced query's `$filter`, with their names there. */
const FILTER_KEYS: Record<string, string> = {
  isDuplicateFilter: "isDuplicate",
  hasDuplicateFilter: "hasDuplicate",
  eventFilter: "hasEvent",
  dataType: "dataType",
  startSourceRankPercentile: "startSourceRankPercentile",
  endSourceRankPercentile: "endSourceRankPercentile",
  minSentiment: "minSentiment",
  maxSentiment: "maxSentiment",
  forceMaxDataTimeWindow: "forceMaxDataTimeWindow",
  showDuplicates: "showDuplicates",
  minSentenceIndex: "minSentenceIndex",
  maxSentenceIndex: "maxSentenceIndex",
};

/** Flat `ignore*` filters have no place in an advanced query; they become its `$not`. */
const IGNORE_TO_LEAF: Record<string, string> = {
  ignoreKeyword: "keyword",
  ignoreConceptUri: "conceptUri",
  ignoreCategoryUri: "categoryUri",
  ignoreSourceUri: "sourceUri",
  ignoreSourceLocationUri: "sourceLocationUri",
  ignoreSourceGroupUri: "sourceGroupUri",
  ignoreAuthorUri: "authorUri",
  ignoreLocationUri: "locationUri",
  ignoreLang: "lang",
  ignoreEventTypeUri: "eventTypeUri",
  ignoreIndustryUri: "industryUri",
};

/** Leaf keys whose values may be ORed inside one leaf. */
const OR_LEAF_KEYS = new Set([
  "keyword",
  "conceptUri",
  "categoryUri",
  "lang",
  "authorUri",
  "sourceUri",
  "sourceLocationUri",
  "sourceGroupUri",
  "locationUri",
  "eventTypeUri",
  "industryUri",
  "sdgUri",
  "esgUri",
  "sasbUri",
]);

/** Days searched when the caller gives no date filter; keeps a search at the cheapest rate. */
export const DEFAULT_WINDOW_DAYS = 31;

/** A keyword that reads as a boolean expression: Tesla AND (recall OR lawsuit) NOT Musk. */
const BOOLEAN_KEYWORD = /\b(AND|OR|NOT|NEAR\/\d+|NEXT\/\d+)\b/;

export interface SearchBody {
  body: Record<string, unknown>;
  /** Short remarks for the model about defaults the server applied. */
  notes: string[];
}

export interface SearchBodyOptions {
  /** How to bound the date window when the caller gave none. */
  dateDefault?: "forceMaxDataTimeWindow" | "dateStart" | "none";
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj =>
  !!v && typeof v === "object" && !Array.isArray(v);

/** Parse the `query` param (object or JSON string) into an object. */
function parseQuery(v: unknown): Obj {
  if (typeof v === "string") {
    try {
      const parsed: unknown = JSON.parse(v);
      if (isObj(parsed)) return parsed;
    } catch {
      /* fall through to the error below */
    }
    throw new ApiError(400, 'Invalid JSON in "query" parameter');
  }
  if (isObj(v)) return v;
  throw new ApiError(400, '"query" must be an object');
}

/**
 * Normalise forgiving spellings of the advanced query into what the API accepts:
 * arrays of values become {"$or": [...]}, a `$not` list becomes {"$not": {"$or": [...]}}.
 */
function normalizeNode(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(normalizeNode);
  if (!isObj(node)) return node;
  const out: Obj = {};
  for (const [k, v] of Object.entries(node)) {
    if (k === "$not" && Array.isArray(v)) {
      out[k] = v.length === 1 ? normalizeNode(v[0]) : { $or: normalizeNode(v) };
    } else if (OR_LEAF_KEYS.has(k) && Array.isArray(v)) {
      out[k] = v.length === 1 ? v[0] : { $or: v };
    } else if (OR_LEAF_KEYS.has(k) && typeof v === "string" && v.includes(",") && k !== "keyword") {
      const parts = parseArray(v) ?? [];
      out[k] = parts.length === 1 ? parts[0] : { $or: parts };
    } else {
      out[k] = normalizeNode(v);
    }
  }
  return out;
}

/** Whether any node of the query tree sets a date bound. */
function hasDate(node: unknown): boolean {
  if (Array.isArray(node)) return node.some(hasDate);
  if (!isObj(node)) return false;
  return Object.entries(node).some(
    ([k, v]) =>
      ((k === "dateStart" || k === "dateEnd" || k === "dateMention") && v != null) ||
      (k === "forceMaxDataTimeWindow" && v != null) ||
      ((k === "$and" || k === "$or" || k === "$query") && hasDate(v)),
  );
}

/** A `$not` with no positive sibling is the most common mistake; the API rejects it. */
function assertPositive(node: unknown, path: string): void {
  if (Array.isArray(node)) {
    node.forEach((n, i) => assertPositive(n, `${path}[${i}]`));
    return;
  }
  if (!isObj(node)) return;
  const keys = Object.keys(node).filter((k) => k !== "$not");
  if (keys.length === 0 && "$not" in node) {
    throw new ApiError(400, {
      error: `${path} contains only "$not". Put "$not" next to the conditions it excludes from, e.g. {"$and": [...], "$not": {...}}.`,
    });
  }
  for (const k of ["$and", "$or"]) if (k in node) assertPositive(node[k], `${path}.${k}`);
}

/** Inside a leaf, upgrade a boolean-looking keyword to exact mode and report it. */
function upgradeBooleanKeyword(leaf: Obj, notes: string[]): void {
  const raw = leaf.keyword;
  const kw = Array.isArray(raw) && raw.length === 1 ? raw[0] : raw;
  if (typeof kw !== "string" || leaf.keywordSearchMode) return;
  if (BOOLEAN_KEYWORD.test(kw) && !kw.includes(",")) {
    leaf.keywordSearchMode = "exact";
    notes.push(
      `keyword "${kw}" was matched as a boolean expression (keywordSearchMode: "exact").`,
    );
  }
}

function walkLeaves(node: unknown, fn: (leaf: Obj) => void): void {
  if (Array.isArray(node)) return node.forEach((n) => walkLeaves(n, fn));
  if (!isObj(node)) return;
  if ("keyword" in node) fn(node);
  for (const k of ["$and", "$or", "$not", "$query"]) if (k in node) walkLeaves(node[k], fn);
}

/**
 * Build the request body for a search. Flat filters given alongside `query`
 * are folded into it instead of being rejected by the API: leaf filters join
 * the query with AND, `ignore*` filters become its `$not`, the rest go to `$filter`.
 */
export function buildSearchBody(
  params: Record<string, unknown>,
  options: SearchBodyOptions = {},
): SearchBody {
  const notes: string[] = [];
  const body: Obj = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || LOCAL_PARAMS.has(k) || k === "query") continue;
    body[k] = ARRAY_FIELDS.has(k) ? parseArray(v) : v;
  }

  if (params.query !== undefined) {
    const q = normalizeNode(parseQuery(params.query)) as Obj;
    const root = isObj(q.$query) ? q.$query : q;
    const filter: Obj = isObj(q.$filter) ? { ...q.$filter } : {};

    const extraLeaf: Obj = {};
    const notLeaf: Obj = {};
    for (const k of QUERY_LEAF_KEYS) {
      if (body[k] === undefined) continue;
      const v = body[k];
      extraLeaf[k] =
        Array.isArray(v) && OR_LEAF_KEYS.has(k)
          ? v.length === 1
            ? v[0]
            : { $or: v }
          : v;
      delete body[k];
    }
    for (const [flat, leaf] of Object.entries(IGNORE_TO_LEAF)) {
      if (body[flat] === undefined) continue;
      const v = body[flat] as string[];
      notLeaf[leaf] = v.length === 1 ? v[0] : { $or: v };
      delete body[flat];
    }
    for (const [flat, name] of Object.entries(FILTER_KEYS)) {
      if (body[flat] === undefined) continue;
      filter[name] ??= body[flat];
      delete body[flat];
    }
    // Operators have no meaning inside an advanced query.
    for (const k of ["keywordOper", "conceptOper", "categoryOper", "ignoreKeywordLoc"]) delete body[k];

    let query: Obj = root;
    if (Object.keys(extraLeaf).length > 0) {
      query = { $and: [root, extraLeaf] };
      notes.push("Flat filters were ANDed with the advanced query.");
    }
    if (Object.keys(notLeaf).length > 0) {
      query = query.$not === undefined ? { ...query, $not: notLeaf } : { $and: [query], $not: notLeaf };
    }
    assertPositive(query, "$query");
    walkLeaves(query, (leaf) => upgradeBooleanKeyword(leaf, notes));

    if (!hasDate(query) && !("forceMaxDataTimeWindow" in filter)) {
      const mode = options.dateDefault ?? "forceMaxDataTimeWindow";
      if (mode === "dateStart") query = { $and: [query, { dateStart: defaultStart() }] };
      else if (mode === "forceMaxDataTimeWindow") filter.forceMaxDataTimeWindow = String(DEFAULT_WINDOW_DAYS);
      if (mode !== "none") notes.push(DATE_NOTE);
    }
    body.query = Object.keys(filter).length > 0 ? { $query: query, $filter: filter } : { $query: query };
    return { body, notes };
  }

  upgradeBooleanKeyword(body, notes);
  if (!hasDate(body)) {
    const mode = options.dateDefault ?? "forceMaxDataTimeWindow";
    if (mode === "dateStart") body.dateStart = defaultStart();
    else if (mode === "forceMaxDataTimeWindow") body.forceMaxDataTimeWindow = DEFAULT_WINDOW_DAYS;
    if (mode !== "none") notes.push(DATE_NOTE);
  }
  return { body, notes };
}

const DATE_NOTE = `No date filter given: searched the last ${DEFAULT_WINDOW_DAYS} days. Set dateStart/dateEnd for older news (costs more API tokens).`;

const defaultStart = () =>
  new Date(Date.now() - DEFAULT_WINDOW_DAYS * 864e5).toISOString().slice(0, 10);

/** Schema for the advanced `query` param of the search tool. */
export function queryProp(): Record<string, unknown> {
  return {
    query: {
      type: ["object", "string"],
      description: `Boolean query for logic the flat params cannot express (OR across different fields, two OR-groups ANDed). {"$query": NODE, "$filter": {...}}; NODE = {"$and": [NODE...]} | {"$or": [NODE...]} | leaf object of filter keys (conceptUri, keyword, keywordLoc, categoryUri, sourceUri, sourceLocationUri, locationUri, authorUri, lang, dateStart, dateEnd, minArticlesInEvent, eventTypeUri); keys in one leaf are ANDed; a value may be {"$or": [...]}; "$not": NODE sits beside "$and"/"$or", never alone. "$filter": isDuplicate, dataType, minSentiment, maxSentiment, startSourceRankPercentile, endSourceRankPercentile.
Example: {"$query": {"$and": [{"$or": [{"conceptUri": "<AI Act>"}, {"keyword": "Digital Services Act"}]}, {"conceptUri": {"$or": ["<Meta>", "<Google>"]}}], "$not": {"conceptUri": "<TikTok>"}}}
Flat params given alongside are merged into it.`,
    },
  };
}
