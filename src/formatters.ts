import type { ResponseFormatter } from "./types.js";

/** Format suggest results as "label -> uri" list. */
export const formatSuggestResults: ResponseFormatter = (data) => {
  if (!Array.isArray(data) || data.length === 0) return "No results found.";
  return data
    .map((item, i) => {
      const label = item.label || item.title || item.name || "Unknown";
      return `${i + 1}. ${label} -> ${item.uri || ""}`;
    })
    .join("\n");
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
  if (pages && pages > 1 && page) {
    lines.push(
      `---\nPage ${page} of ${pages}. Use articlesPage: ${page + 1} for more.`,
    );
  }
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
  if (pages && pages > 1 && page) {
    lines.push(
      `---\nPage ${page} of ${pages}. Use eventsPage: ${page + 1} for more.`,
    );
  }
  return lines.join("\n\n---\n\n");
};

/** Format API usage as key-value pairs. */
export const formatUsageResults: ResponseFormatter = (data) => {
  const u = data as Record<string, unknown>;
  return [
    `Plan: ${u.planName || "Unknown"}`,
    `Daily: ${u.dailyUsed || 0} / ${u.dailyAvailable || 0}`,
    `Monthly: ${u.monthlyUsed || 0} / ${u.monthlyAvailable || 0}`,
  ].join("\n");
};
