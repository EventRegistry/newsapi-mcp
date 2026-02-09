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

/** Format article search results as numbered list with full body. */
export const formatArticleResults: ResponseFormatter = (data) => {
  const articles = (data as Record<string, unknown>)?.articles as
    | Record<string, unknown>
    | undefined;
  const results = articles?.results as Record<string, unknown>[] | undefined;
  if (!results?.length) return "No articles found.";

  const lines = results.map((art, i) => {
    const date =
      (art.dateTimePub as string | undefined)?.split("T")[0] || "Unknown";
    const source =
      (art.source as Record<string, unknown> | undefined)?.title || "Unknown";
    const body = (art.body as string) || "";
    const url = art.url ? `\n   URL: ${art.url}` : "";
    return `${i + 1}. [${date}] ${art.title || "Untitled"} - ${source}${url}\n\n${body}`;
  });

  // Pagination footer
  const pages = articles?.pages as number | undefined;
  const page = articles?.page as number | undefined;
  const totalResults = articles?.totalResults as number | undefined;
  const countParts: string[] = [];
  countParts.push(`${results.length} results`);
  if (totalResults != null) countParts.push(`(${totalResults} total)`);
  if (pages && pages > 1 && page) {
    countParts.push(
      `Page ${page} of ${pages}. Use articlesPage: ${page + 1} for more.`,
    );
  }
  lines.push(`---\n${countParts.join(" ")}`);
  return lines.join("\n\n---\n\n");
};

/** Format event search results with full summary. */
export const formatEventResults: ResponseFormatter = (data) => {
  const events = (data as Record<string, unknown>)?.events as
    | Record<string, unknown>
    | undefined;
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
    const count =
      (evt.articleCounts as Record<string, unknown> | undefined)?.total || 0;
    return `${i + 1}. [${evt.eventDate || "Unknown"}] ${title} (${count} articles)\n   URI: ${evt.uri || ""}\n\n${summary}`;
  });

  // Pagination footer
  const pages = events?.pages as number | undefined;
  const page = events?.page as number | undefined;
  const totalResults = events?.totalResults as number | undefined;
  const countParts: string[] = [];
  countParts.push(`${results.length} results`);
  if (totalResults != null) countParts.push(`(${totalResults} total)`);
  if (pages && pages > 1 && page) {
    countParts.push(
      `Page ${page} of ${pages}. Use eventsPage: ${page + 1} for more.`,
    );
  }
  lines.push(`---\n${countParts.join(" ")}`);
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
    const date =
      (art.dateTimePub as string | undefined)?.split("T")[0] || "Unknown";
    const source =
      (art.source as Record<string, unknown> | undefined)?.title || "Unknown";
    const body = (art.body as string) || "";
    const url = art.url ? `\n   URL: ${art.url}` : "";
    return `${i + 1}. [${date}] ${art.title || "Untitled"} - ${source}${url}\n\n${body}`;
  });

  return lines.join("\n\n---\n\n");
};

/** Format event detail responses (filterTopLevel structure: { "<uri>": { info: {...} } }). */
export const formatEventDetails: ResponseFormatter = (data) => {
  if (!data || typeof data !== "object") return "No event details found.";
  const entries = Object.entries(data as Record<string, unknown>);
  if (entries.length === 0) return "No event details found.";

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
    const count =
      (evt.articleCounts as Record<string, unknown> | undefined)?.total || 0;
    return `${i + 1}. [${evt.eventDate || "Unknown"}] ${title} (${count} articles)\n   URI: ${evt.uri || ""}\n\n${summary}`;
  });

  return lines.join("\n\n---\n\n");
};

/** Format API usage as key-value pairs. */
export const formatUsageResults: ResponseFormatter = (data) => {
  const u = data as Record<string, unknown>;
  const used = (u.usedTokens as number) || 0;
  const available = (u.availableTokens as number) || 0;
  return [
    `Tokens used: ${used.toLocaleString()}`,
    `Tokens available: ${available.toLocaleString()}`,
  ].join("\n");
};
