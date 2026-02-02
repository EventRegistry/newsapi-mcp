/** Response filtering to reduce token usage by stripping unnecessary fields. */

/** Valid field group names that callers can opt into. */
export type FieldGroup =
  | "sentiment"
  | "concepts"
  | "categories"
  | "images"
  | "authors"
  | "location"
  | "social"
  | "metadata"
  | "event"
  | "full";

const VALID_GROUPS = new Set<string>([
  "sentiment",
  "concepts",
  "categories",
  "images",
  "authors",
  "location",
  "social",
  "metadata",
  "event",
  "full",
]);

/** Parse comma-separated field group string into a Set. */
export function parseFieldGroups(includeFields?: string): Set<string> {
  if (!includeFields) return new Set();
  const groups = new Set<string>();
  for (const raw of includeFields.split(",")) {
    const g = raw.trim().toLowerCase();
    if (g && VALID_GROUPS.has(g)) groups.add(g);
  }
  return groups;
}

/**
 * Get API include* params based on field groups.
 * Returns params to send to the API to request additional data.
 */
export function getArticleIncludeParams(
  groups: Set<string>,
): Record<string, boolean> {
  const params: Record<string, boolean> = {};
  if (groups.has("full")) {
    // Request everything from the API
    params.includeArticleConcepts = true;
    params.includeArticleCategories = true;
    params.includeArticleImage = true;
    params.includeArticleAuthors = true;
    params.includeArticleLocation = true;
    params.includeArticleSocialScore = true;
    params.includeArticleSentiment = true;
    return params;
  }
  if (groups.has("concepts")) params.includeArticleConcepts = true;
  if (groups.has("categories")) params.includeArticleCategories = true;
  if (groups.has("images")) params.includeArticleImage = true;
  if (groups.has("authors")) params.includeArticleAuthors = true;
  if (groups.has("location")) params.includeArticleLocation = true;
  if (groups.has("social")) params.includeArticleSocialScore = true;
  if (groups.has("sentiment")) params.includeArticleSentiment = true;
  return params;
}

export function getEventIncludeParams(
  groups: Set<string>,
): Record<string, boolean> {
  const params: Record<string, boolean> = {
    includeEventSummary: true, // always include summary for events
  };
  if (groups.has("full")) {
    params.includeEventConcepts = true;
    params.includeEventCategories = true;
    params.includeEventImages = true;
    params.includeEventLocation = true;
    params.includeEventSocialScore = true;
    params.includeEventSentiment = true;
    return params;
  }
  if (groups.has("concepts")) params.includeEventConcepts = true;
  if (groups.has("categories")) params.includeEventCategories = true;
  if (groups.has("images")) params.includeEventImages = true;
  if (groups.has("location")) params.includeEventLocation = true;
  if (groups.has("social")) params.includeEventSocialScore = true;
  if (groups.has("sentiment")) params.includeEventSentiment = true;
  return params;
}

export function getMentionIncludeParams(
  groups: Set<string>,
): Record<string, boolean> {
  const params: Record<string, boolean> = {};
  if (groups.has("full")) {
    params.includeMentionSourceLocation = true;
    return params;
  }
  if (groups.has("location")) params.includeMentionSourceLocation = true;
  return params;
}

// --- Response-side filtering ---

/** Fields to always keep on articles (minimal set). */
const ARTICLE_MINIMAL = new Set([
  "uri",
  "title",
  "body",
  "dateTimePub",
  "url",
  "source",
]);

/** Additional article fields per group. */
const ARTICLE_GROUP_FIELDS: Record<string, string[]> = {
  sentiment: ["sentiment"],
  concepts: ["concepts"],
  categories: ["categories"],
  images: ["image"],
  authors: ["authors"],
  location: ["location"],
  social: ["shares"],
  metadata: [
    "relevance",
    "wgt",
    "sim",
    "isDuplicate",
    "dataType",
    "lang",
    "date",
    "time",
    "dateTime",
  ],
  event: ["eventUri", "storyUri"],
};

/** Fields to always keep on events (minimal set). */
const EVENT_MINIMAL = new Set([
  "uri",
  "title",
  "eventDate",
  "summary",
  "articleCounts",
]);

const EVENT_GROUP_FIELDS: Record<string, string[]> = {
  sentiment: ["sentiment"],
  concepts: ["concepts"],
  categories: ["categories"],
  images: ["images"],
  location: ["location"],
  social: ["socialScore"],
  metadata: ["wgt", "relevance"],
};

/** Fields to always keep on mentions (minimal set). */
const MENTION_MINIMAL = new Set(["uri", "sentence", "date", "source"]);

const MENTION_GROUP_FIELDS: Record<string, string[]> = {
  sentiment: ["sentiment"],
  metadata: [
    "time",
    "lang",
    "eventTypeUri",
    "factLevel",
    "articleUri",
    "articleUrl",
    "sentenceIdx",
  ],
  location: ["location"],
};

function buildAllowedFields(
  minimal: Set<string>,
  groupFields: Record<string, string[]>,
  groups: Set<string>,
): Set<string> {
  const allowed = new Set(minimal);
  for (const group of groups) {
    const fields = groupFields[group];
    if (fields) {
      for (const f of fields) allowed.add(f);
    }
  }
  return allowed;
}

function pickFields(
  obj: Record<string, unknown>,
  allowed: Set<string>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

function filterSource(source: unknown): unknown {
  if (!source || typeof source !== "object") return source;
  const s = source as Record<string, unknown>;
  return { title: s.title, uri: s.uri };
}

/** Filter a single article object. */
export function filterArticle(
  article: Record<string, unknown>,
  groups: Set<string>,
  bodyLen?: number,
): Record<string, unknown> {
  if (groups.has("full")) {
    return applyBodyLen(article, bodyLen);
  }
  const allowed = buildAllowedFields(
    ARTICLE_MINIMAL,
    ARTICLE_GROUP_FIELDS,
    groups,
  );
  const result = pickFields(article, allowed);
  // Trim source to minimal
  if (result.source && !groups.has("location")) {
    result.source = filterSource(result.source);
  }
  return applyBodyLen(result, bodyLen);
}

function applyBodyLen(
  article: Record<string, unknown>,
  bodyLen?: number,
): Record<string, unknown> {
  if (bodyLen === undefined || bodyLen < 0) return article;
  if (bodyLen === 0) {
    const { body: _, ...rest } = article;
    return rest;
  }
  if (typeof article.body === "string" && article.body.length > bodyLen) {
    return { ...article, body: article.body.slice(0, bodyLen) };
  }
  return article;
}

/** Filter a single event object. */
export function filterEvent(
  event: Record<string, unknown>,
  groups: Set<string>,
): Record<string, unknown> {
  if (groups.has("full")) return event;
  const allowed = buildAllowedFields(EVENT_MINIMAL, EVENT_GROUP_FIELDS, groups);
  const result = pickFields(event, allowed);
  // Trim articleCounts to just total
  if (
    result.articleCounts &&
    typeof result.articleCounts === "object" &&
    !groups.has("metadata")
  ) {
    const counts = result.articleCounts as Record<string, unknown>;
    result.articleCounts = { total: counts.total };
  }
  return result;
}

/** Filter a single mention object. */
export function filterMention(
  mention: Record<string, unknown>,
  groups: Set<string>,
): Record<string, unknown> {
  if (groups.has("full")) return mention;
  const allowed = buildAllowedFields(
    MENTION_MINIMAL,
    MENTION_GROUP_FIELDS,
    groups,
  );
  const result = pickFields(mention, allowed);
  if (result.source && !groups.has("location")) {
    result.source = filterSource(result.source);
  }
  return result;
}

export type ResultType = "articles" | "events" | "mentions";

export interface FilterOptions {
  resultType: ResultType;
  groups: Set<string>;
  bodyLen?: number;
}

/**
 * Filter a full API response, preserving pagination metadata.
 * Handles the wrapper structure: { articles: { results: [...], ... } }
 */
export function filterResponse(
  response: unknown,
  options: FilterOptions,
): unknown {
  if (!response || typeof response !== "object") return response;
  if (
    options.groups.has("full") &&
    (options.bodyLen === undefined || options.bodyLen < 0)
  ) {
    return response;
  }

  const resp = response as Record<string, unknown>;
  const { resultType, groups, bodyLen } = options;

  // The API wraps results like: { articles: { results: [...], totalResults: N, page: N, count: N, pages: N } }
  const wrapper = resp[resultType];
  if (!wrapper || typeof wrapper !== "object") {
    // Try filtering at top level (e.g. getArticle returns { uri: { info: ... } })
    return filterTopLevel(resp, options);
  }

  const wrapperObj = wrapper as Record<string, unknown>;
  const results = wrapperObj.results;

  if (Array.isArray(results)) {
    const filtered = results.map((item: unknown) => {
      if (!item || typeof item !== "object") return item;
      const obj = item as Record<string, unknown>;
      switch (resultType) {
        case "articles":
          return filterArticle(obj, groups, bodyLen);
        case "events":
          return filterEvent(obj, groups);
        case "mentions":
          return filterMention(obj, groups);
        default:
          return obj;
      }
    });

    // Preserve pagination metadata
    const newWrapper: Record<string, unknown> = { results: filtered };
    for (const key of ["totalResults", "page", "count", "pages"]) {
      if (key in wrapperObj) newWrapper[key] = wrapperObj[key];
    }
    return { ...resp, [resultType]: newWrapper };
  }

  return response;
}

/** Handle responses that don't follow the standard wrapper (e.g. getArticle, getEvent). */
function filterTopLevel(
  resp: Record<string, unknown>,
  options: FilterOptions,
): Record<string, unknown> {
  const { resultType, groups, bodyLen } = options;
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(resp)) {
    if (!value || typeof value !== "object") {
      result[key] = value;
      continue;
    }
    const obj = value as Record<string, unknown>;
    // Check if this looks like an article/event/mention info wrapper
    const info = obj.info;
    if (info && typeof info === "object") {
      const infoObj = info as Record<string, unknown>;
      switch (resultType) {
        case "articles":
          result[key] = {
            ...obj,
            info: filterArticle(infoObj, groups, bodyLen),
          };
          break;
        case "events":
          result[key] = { ...obj, info: filterEvent(infoObj, groups) };
          break;
        default:
          result[key] = value;
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}
