import type { ResponseFormatter } from "./types.js";

/** Extract label string from item, handling both string and object forms. */
function extractLabel(item: Record<string, unknown>): string {
  const label = item.label;
  // Handle label as object with language keys (e.g., {"eng": "Slovenia"})
  if (label && typeof label === "object") {
    const labelObj = label as Record<string, string>;
    return labelObj.eng || Object.values(labelObj)[0] || "Unknown";
  }
  // Handle label as string or fallback to title/name
  if (typeof label === "string") return label;
  if (typeof item.title === "string") return item.title;
  if (typeof item.name === "string") return item.name;
  return "Unknown";
}

/** Format location suggest results as numbered text. */
export const formatSuggestLocations: ResponseFormatter = (data) => {
  if (!Array.isArray(data) || data.length === 0) return "No results found.";
  return data
    .map((item, i) => {
      const rec = item as Record<string, unknown>;
      const label = extractLabel(rec);
      const type = rec.type || "location";
      const uri = rec.wikiUri || "";
      const country = rec.country as Record<string, unknown> | undefined;
      const countryStr = country ? ` - ${extractLabel(country)}` : "";
      return `${i + 1}. ${label} [${type}]${countryStr}\n   ${uri}`;
    })
    .join("\n\n");
};

/** Format concept suggest results as numbered text. */
export const formatSuggestConcepts: ResponseFormatter = (data) => {
  if (!Array.isArray(data) || data.length === 0) return "No results found.";
  return data
    .map((item, i) => {
      const rec = item as Record<string, unknown>;
      const label = extractLabel(rec);
      const type = rec.type || "concept";
      const uri = rec.uri || "";
      return `${i + 1}. ${label} [${type}]\n   ${uri}`;
    })
    .join("\n\n");
};

/** Format source suggest results as numbered text. */
export const formatSuggestSources: ResponseFormatter = (data) => {
  if (!Array.isArray(data) || data.length === 0) return "No results found.";
  return data
    .map((item, i) => {
      const rec = item as Record<string, unknown>;
      const label = (rec.title as string) || "Unknown";
      const dataType = rec.dataType || "news";
      const uri = rec.uri || "";
      return `${i + 1}. ${label} [${dataType}]\n   ${uri}`;
    })
    .join("\n\n");
};

/** Format category suggest results as numbered text. */
export const formatSuggestCategories: ResponseFormatter = (data) => {
  if (!Array.isArray(data) || data.length === 0) return "No results found.";
  return data
    .map((item, i) => {
      const rec = item as Record<string, unknown>;
      const label = extractLabel(rec);
      const uri = rec.uri || "";
      return `${i + 1}. ${label}\n   ${uri}`;
    })
    .join("\n\n");
};

/** Format author suggest results as numbered text. */
export const formatSuggestAuthors: ResponseFormatter = (data) => {
  if (!Array.isArray(data) || data.length === 0) return "No results found.";
  return data
    .map((item, i) => {
      const rec = item as Record<string, unknown>;
      const name = (rec.name as string) || "Unknown";
      const uri = rec.uri || "";
      const source = rec.source as Record<string, unknown> | undefined;
      const sourceStr = source?.title ? ` (${source.title})` : "";
      return `${i + 1}. ${name}${sourceStr}\n   ${uri}`;
    })
    .join("\n\n");
};

/** Format event type suggest results as numbered text. */
export const formatSuggestEventTypes: ResponseFormatter = (data) => {
  if (!Array.isArray(data) || data.length === 0) return "No results found.";
  return data
    .map((item, i) => {
      const rec = item as Record<string, unknown>;
      return `${i + 1}. ${extractLabel(rec)}\n   ${rec.uri || ""}`;
    })
    .join("\n\n");
};

/** The "N results (M total) Page X of Y" line closing every paged list. */
function paginationFooter(
  wrapper: Record<string, unknown> | undefined,
  shown: number,
  pageParam: string,
): string {
  const pages = wrapper?.pages as number | undefined;
  const page = wrapper?.page as number | undefined;
  const totalResults = wrapper?.totalResults as number | undefined;
  const parts = [`${shown} results`];
  if (totalResults != null) parts.push(`(${totalResults} total)`);
  if (pages && pages > 1 && page) {
    parts.push(
      `Page ${page} of ${pages}. Use ${pageParam}: ${page + 1} for more.`,
    );
  }
  return `---\n${parts.join(" ")}`;
}

/** Render optional includeFields data as indented metadata lines for articles. */
function formatArticleExtras(art: Record<string, unknown>): string {
  const lines: string[] = [];
  if (art.sentiment != null) lines.push(`   Sentiment: ${art.sentiment}`);
  if (Array.isArray(art.concepts) && art.concepts.length > 0) {
    const items = (art.concepts as Record<string, unknown>[]).map((c) => {
      const label = extractLabel(c) || String(c.uri || "?");
      return c.type ? `${label} [${c.type}]` : String(label);
    });
    lines.push(`   Concepts: ${items.join(", ")}`);
  }
  if (Array.isArray(art.categories) && art.categories.length > 0) {
    const items = (art.categories as Record<string, unknown>[]).map(
      (c) => extractLabel(c) || String(c.uri || "?"),
    );
    lines.push(`   Categories: ${items.join(", ")}`);
  }
  if (Array.isArray(art.authors) && art.authors.length > 0) {
    const items = (art.authors as Record<string, unknown>[]).map((a) =>
      String(a.name || a.uri || "?"),
    );
    lines.push(`   Authors: ${items.join(", ")}`);
  }
  if (typeof art.image === "string") lines.push(`   Image: ${art.image}`);
  if (art.location && typeof art.location === "object") {
    const loc = art.location as Record<string, unknown>;
    const label = typeof loc.label === "object" ? extractLabel(loc) : loc.label;
    if (label) lines.push(`   Location: ${label}`);
  }
  if (art.shares && typeof art.shares === "object") {
    const items = Object.entries(art.shares as Record<string, unknown>).map(
      ([k, v]) => `${k}: ${v}`,
    );
    if (items.length > 0) lines.push(`   Shares: ${items.join(", ")}`);
  }
  if (art.eventUri) lines.push(`   Event: ${art.eventUri}`);
  if (art.storyUri) lines.push(`   Story: ${art.storyUri}`);
  const metaKeys = [
    "lang",
    "relevance",
    "wgt",
    "sim",
    "isDuplicate",
    "dataType",
  ];
  const metaParts = metaKeys
    .filter((k) => art[k] != null)
    .map((k) => `${k}: ${art[k]}`);
  if (metaParts.length > 0) lines.push(`   ${metaParts.join(" | ")}`);
  return lines.length > 0 ? "\n" + lines.join("\n") : "";
}

/** Render optional includeFields data as indented metadata lines for events. */
function formatEventExtras(evt: Record<string, unknown>): string {
  const lines: string[] = [];
  if (evt.sentiment != null) lines.push(`   Sentiment: ${evt.sentiment}`);
  if (Array.isArray(evt.concepts) && evt.concepts.length > 0) {
    const items = (evt.concepts as Record<string, unknown>[]).map((c) => {
      const label = extractLabel(c) || String(c.uri || "?");
      return c.type ? `${label} [${c.type}]` : String(label);
    });
    lines.push(`   Concepts: ${items.join(", ")}`);
  }
  if (Array.isArray(evt.categories) && evt.categories.length > 0) {
    const items = (evt.categories as Record<string, unknown>[]).map(
      (c) => extractLabel(c) || String(c.uri || "?"),
    );
    lines.push(`   Categories: ${items.join(", ")}`);
  }
  if (Array.isArray(evt.images) && evt.images.length > 0) {
    lines.push(`   Images: ${(evt.images as string[]).join(", ")}`);
  }
  if (evt.location && typeof evt.location === "object") {
    const loc = evt.location as Record<string, unknown>;
    const label = typeof loc.label === "object" ? extractLabel(loc) : loc.label;
    if (label) lines.push(`   Location: ${label}`);
  }
  if (evt.socialScore != null)
    lines.push(`   Social score: ${evt.socialScore}`);
  if (evt.breakingScore != null)
    lines.push(`   Breaking score: ${evt.breakingScore}`);
  const metaKeys = ["wgt", "relevance"];
  const metaParts = metaKeys
    .filter((k) => evt[k] != null)
    .map((k) => `${k}: ${evt[k]}`);
  if (metaParts.length > 0) lines.push(`   ${metaParts.join(" | ")}`);
  return lines.length > 0 ? "\n" + lines.join("\n") : "";
}

/** "2026-10-09T14:32:00Z" → "2026-10-09 14:32" so same-day articles stay orderable. */
function formatDateTime(value: unknown): string {
  if (typeof value !== "string" || !value) return "Unknown";
  return value.replace("T", " ").slice(0, 16);
}

/** One row per article for a scan (no bodies): index, uri, date, source, title. URLs come with the details. */
function formatArticleRows(
  results: Record<string, unknown>[],
  wrapper: Record<string, unknown> | undefined,
): string {
  const rows = results.map((art, i) => {
    const date = formatDateTime(art.dateTimePub);
    const source =
      (art.source as Record<string, unknown> | undefined)?.title || "Unknown";
    const extras = formatArticleExtras(art).replace(/\n\s+/g, " · ").trim();
    return `${i + 1} | ${art.uri ?? "?"} | ${date} | ${source} | ${art.title || "Untitled"}${extras ? ` | ${extras}` : ""}`;
  });
  return [
    "# | uri | date | source | title",
    ...rows,
    paginationFooter(wrapper, results.length, "page") +
      " Pass uri values to get_article_details for full text and URLs.",
  ].join("\n");
}

/** Format article search results: compact rows for a scan, numbered blocks with bodies otherwise. */
export const formatArticleResults: ResponseFormatter = (data, params) => {
  const articles = (data as Record<string, unknown>)?.articles as
    Record<string, unknown> | undefined;
  const results = articles?.results as Record<string, unknown>[] | undefined;
  if (!results?.length) return "No articles found.";
  if (params?.articleBodyLen === 0) return formatArticleRows(results, articles);

  const lines = results.map((art, i) => {
    const title = art.title || "Untitled";
    const date = formatDateTime(art.dateTimePub);
    const source =
      (art.source as Record<string, unknown> | undefined)?.title || "Unknown";
    const body = (art.body as string) || "";
    const url = art.url ? `\n   URL: ${art.url}` : "";
    const uri = art.uri ? `\n   URI: ${art.uri}` : "";
    return `${i + 1}. [${date}] ${title} - ${source}${url}${uri}${formatArticleExtras(art)}\n\n${body}`;
  });

  lines.push(
    paginationFooter(
      articles,
      results.length,
      params?.kind ? "page" : "articlesPage",
    ),
  );
  return lines.join("\n\n---\n\n");
};

/** Format mention search results: one sentence per entry with its event type and article. */
export const formatMentionResults: ResponseFormatter = (data) => {
  const mentions = (data as Record<string, unknown>)?.mentions as
    Record<string, unknown> | undefined;
  if (!mentions || typeof mentions !== "object")
    return JSON.stringify(data, null, 2);
  const results = mentions.results as Record<string, unknown>[] | undefined;
  if (!results?.length) return "No mentions found.";

  const lines = results.map((m, i) => {
    const date = formatDateTime(m.dateTime);
    const source =
      (m.source as Record<string, unknown> | undefined)?.title || "Unknown";
    const eventType =
      typeof m.eventType === "object" && m.eventType
        ? extractLabel(m.eventType as Record<string, unknown>)
        : m.eventType || "?";
    const head = `${i + 1}. [${date}] ${eventType} - ${source}`;
    const detail = [`   "${m.sentence || ""}"`];
    if (m.articleTitle) detail.push(`   Article: ${m.articleTitle}`);
    if (m.articleUrl) detail.push(`   URL: ${m.articleUrl}`);
    if (m.uri) {
      const art = m.articleUri ? ` (article ${m.articleUri})` : "";
      detail.push(`   URI: ${m.uri}${art}`);
    }
    return `${head}\n${detail.join("\n")}${formatMentionExtras(m)}`;
  });

  lines.push(paginationFooter(mentions, results.length, "page"));
  return lines.join("\n\n---\n\n");
};

/** Render sentiment, fact level and optional includeFields data for a mention. */
function formatMentionExtras(m: Record<string, unknown>): string {
  const lines: string[] = [];
  if (m.sentenceSentiment != null)
    lines.push(`   Sentiment: ${m.sentenceSentiment}`);
  if (m.factLevel) lines.push(`   Fact level: ${m.factLevel}`);
  if (Array.isArray(m.slots) && m.slots.length > 0) {
    const items = (m.slots as Record<string, unknown>[]).map((s) => {
      const label =
        (s.label && typeof s.label === "object" ? extractLabel(s) : s.label) ||
        s.text ||
        s.uri ||
        "?";
      return s.type ? `${label} [${s.type}]` : String(label);
    });
    lines.push(`   Entities: ${[...new Set(items)].join(", ")}`);
  }
  if (Array.isArray(m.categories) && m.categories.length > 0) {
    const items = (m.categories as Record<string, unknown>[]).map(
      (c) => extractLabel(c) || String(c.uri || "?"),
    );
    lines.push(`   Categories: ${items.join(", ")}`);
  }
  if (m.frameworks && typeof m.frameworks === "object") {
    const items = Object.values(m.frameworks as Record<string, unknown>)
      .filter((f) => f && typeof f === "object")
      .map((f) => extractLabel(f as Record<string, unknown>));
    if (items.length > 0) lines.push(`   Frameworks: ${items.join(", ")}`);
  }
  const metaKeys = [
    "lang",
    "relevance",
    "sentenceIndex",
    "isDuplicate",
    "articleSentiment",
    "eventTypeSentiment",
  ];
  const metaParts = metaKeys
    .filter((k) => m[k] != null)
    .map((k) => `${k}: ${m[k]}`);
  if (metaParts.length > 0) lines.push(`   ${metaParts.join(" | ")}`);
  if (m.articleImageUrl) lines.push(`   Image: ${m.articleImageUrl}`);
  return lines.length > 0 ? "\n" + lines.join("\n") : "";
}

/** Format event search results with full summary. */
export const formatEventResults: ResponseFormatter = (data, params) => {
  const resp = data as Record<string, unknown> | undefined;
  const breaking = resp?.breakingEvents !== undefined;
  const events = (breaking ? resp?.breakingEvents : resp?.events) as
    Record<string, unknown> | undefined;
  const pageParam = breaking
    ? "breakingEventsPage"
    : params?.kind
      ? "page"
      : "eventsPage";
  const results = events?.results as Record<string, unknown>[] | undefined;
  if (!results?.length) return "No events found.";

  const lines = results.map((evt, i) => {
    const titleField = evt.title;
    const title =
      typeof titleField === "string"
        ? titleField
        : (titleField as Record<string, unknown> | undefined)?.eng ||
          "Untitled";
    const summaryField = evt.summary;
    const summary =
      typeof summaryField === "string"
        ? summaryField
        : (summaryField as Record<string, unknown> | undefined)?.eng || "";
    const date = evt.eventDate || "Unknown";
    const count = (evt.totalArticleCount as number) || 0;
    const uri = evt.uri ? `\n   URI: ${evt.uri}` : "";
    return `${i + 1}. [${date}] ${title} (${count} articles)${uri}${formatEventExtras(evt)}\n\n${summary}`;
  });

  lines.push(paginationFooter(events, results.length, pageParam));
  return lines.join("\n\n---\n\n");
};

/** Format article detail responses (filterTopLevel structure: { "<uri>": { info: {...} } }). */
export const formatArticleDetails: ResponseFormatter = (data) => {
  if (!data || typeof data !== "object") return "No article details found.";
  const entries = Object.entries(data as Record<string, unknown>);
  if (entries.length === 0) return "No article details found.";

  const lines = entries.map(([, value], i) => {
    const obj = value as Record<string, unknown> | undefined;
    if (!obj || typeof obj !== "object") return `${i + 1}. (unavailable)`;
    const art = (obj.info as Record<string, unknown>) ?? obj;
    const date = formatDateTime(art.dateTimePub);
    const source =
      (art.source as Record<string, unknown> | undefined)?.title || "Unknown";
    const title = art.title || "Untitled";
    const body = (art.body as string) || "";
    const url = art.url ? `\n   URL: ${art.url}` : "";
    const uri = art.uri ? `\n   URI: ${art.uri}` : "";
    return `${i + 1}. [${date}] ${title} - ${source}${url}${uri}${formatArticleExtras(art)}\n\n${body}`;
  });

  return lines.join("\n\n---\n\n");
};

/** Format event detail responses (filterTopLevel structure: { "<uri>": { info: {...} } }). */
export const formatEventDetails: ResponseFormatter = (data) => {
  if (!data || typeof data !== "object") return "No event details found.";
  const entries = Object.entries(data as Record<string, unknown>);
  if (entries.length === 0) return "No event details found.";

  // Detect non-info resultType responses (articles, articleUris, similarEvents)
  // These don't have the { "<uri>": { info: {...} } } shape
  const firstValue = entries[0]![1];
  const isInfoShape =
    firstValue &&
    typeof firstValue === "object" &&
    ("info" in (firstValue as Record<string, unknown>) ||
      "title" in (firstValue as Record<string, unknown>) ||
      "eventDate" in (firstValue as Record<string, unknown>));
  if (!isInfoShape) {
    return JSON.stringify(data, null, 2);
  }

  const lines = entries.map(([, value], i) => {
    const obj = value as Record<string, unknown> | undefined;
    if (!obj || typeof obj !== "object") return `${i + 1}. (unavailable)`;
    const evt = (obj.info as Record<string, unknown>) ?? obj;
    const titleField = evt.title;
    const title =
      typeof titleField === "string"
        ? titleField
        : (titleField as Record<string, unknown> | undefined)?.eng ||
          "Untitled";
    const summaryField = evt.summary;
    const summary =
      typeof summaryField === "string"
        ? summaryField
        : (summaryField as Record<string, unknown> | undefined)?.eng || "";
    const count = (evt.totalArticleCount as number) || 0;
    const date = evt.eventDate || "Unknown";
    const uri = evt.uri ? `\n   URI: ${evt.uri}` : "";
    return `${i + 1}. [${date}] ${title} (${count} articles)${uri}${formatEventExtras(evt)}\n\n${summary}`;
  });

  return lines.join("\n\n---\n\n");
};

/** The human-readable name of an aggregate row, whichever aggregate kind it comes from. */
function aggregateRowLabel(row: Record<string, unknown>): string {
  for (const key of ["date", "keyword", "lang", "sentiment"]) {
    const v = row[key];
    if (v != null && typeof v !== "object") return String(v);
  }
  const nested = aggregateRowEntity(row) ?? row;
  const label = extractLabel(nested);
  const named =
    label && label !== "Unknown" ? label : String(nested.uri || "?");
  return typeof nested.type === "string" ? `${named} [${nested.type}]` : named;
}

/** The entity object a row wraps (source, author, location), if any. */
function aggregateRowEntity(
  row: Record<string, unknown>,
): Record<string, unknown> | undefined {
  for (const key of ["source", "author", "location"]) {
    const nested = row[key];
    if (nested && typeof nested === "object") {
      return nested as Record<string, unknown>;
    }
  }
  return undefined;
}

/** Fields that describe a row rather than measure it. */
const AGGREGATE_LABEL_KEYS = new Set(["sentiment", "lat", "long"]);

// sourceAggr rows nest { counts: { frequency: <in this query>, total: <overall> } }.
const AGGREGATE_COUNT_KEYS = ["count", "frequency", "weight", "score", "wgt"];

/** The numeric measure of an aggregate row: a known count field, else its first number. */
function aggregateRowValue(row: Record<string, unknown>): string {
  const candidates = [row, row.counts, aggregateRowEntity(row)].filter(
    (o): o is Record<string, unknown> => !!o && typeof o === "object",
  );
  for (const obj of candidates) {
    for (const key of AGGREGATE_COUNT_KEYS) {
      if (typeof obj[key] === "number") return ` — ${roundNumber(obj[key])}`;
    }
  }
  for (const [key, v] of Object.entries(row)) {
    if (typeof v === "number" && !AGGREGATE_LABEL_KEYS.has(key)) {
      return ` — ${roundNumber(v)}`;
    }
  }
  return "";
}

function roundNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/** sentimentAggr is a histogram of 20 bare counts over [-1, 1]; label each bucket. */
function sentimentBucketLabel(i: number, total: number): string {
  const width = 2 / total;
  const from = -1 + i * width;
  return `${from.toFixed(1)} to ${(from + width).toFixed(1)}`;
}

/** Format an aggregate response ({ <resultType>: { results: [...] } }) as numbered rows. */
export const formatAggregate: ResponseFormatter = (data, params) => {
  const aggr = (data as Record<string, unknown> | undefined)?.[
    String(params.resultType)
  ];
  if (!aggr || typeof aggr !== "object") return JSON.stringify(data, null, 2);
  const entries = Object.entries(aggr as Record<string, unknown>);
  const lists = entries.filter(([, v]) => Array.isArray(v));
  if (lists.length === 0) return JSON.stringify(data, null, 2);

  // Scalars (totals, averages) head the output; each list is a numbered section.
  const header = entries
    .filter(([, v]) => v === null || typeof v !== "object")
    .map(([k, v]) => `${k}: ${v}`);
  const sections = lists.map(([key, rows]) => {
    const items = (rows as unknown[]).map((row, i, all) => {
      if (typeof row === "number" && params.resultType === "sentimentAggr") {
        return `${i + 1}. ${sentimentBucketLabel(i, all.length)} — ${row}`;
      }
      if (!row || typeof row !== "object") return `${i + 1}. ${String(row)}`;
      const rec = row as Record<string, unknown>;
      return `${i + 1}. ${aggregateRowLabel(rec)}${aggregateRowValue(rec)}`;
    });
    const body = items.length > 0 ? items.join("\n") : "No results found.";
    return key === "results" ? body : `${key}:\n${body}`;
  });
  return [...header, ...sections].join("\n\n");
};

/** Format API usage as key-value pairs. */
export const formatUsageResults: ResponseFormatter = (data) => {
  const u = data as Record<string, unknown>;
  const used = (u.usedTokens as number) || 0;
  const available = (u.availableTokens as number) || 0;
  return [`Tokens used: ${used}`, `Tokens available: ${available}`].join("\n");
};
