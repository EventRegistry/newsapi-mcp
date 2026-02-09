import { ApiError } from "./types.js";

/** Known param values for common fields, used in invalid_param suggestions. */
const KNOWN_PARAM_VALUES: Record<string, string[]> = {
  lang: ["eng", "deu", "fra", "spa", "ita", "por", "rus", "zho", "jpn", "ara"],
  detailLevel: ["minimal", "standard", "full"],
  articlesSortBy: [
    "date",
    "rel",
    "sourceImportance",
    "sourceAlexaGlobalRank",
    "socialScore",
    "facebookShares",
  ],
  eventsSortBy: ["date", "rel", "size", "socialScore"],
  isDuplicateFilter: ["keepAll", "skipDuplicates", "keepOnlyDuplicates"],
  keywordLoc: ["body", "title", "title,body"],
  keywordOper: ["and", "or"],
  dataType: ["news", "pr", "blog"],
};

/** Try to extract a param name from the API error body. */
function extractParamHint(body: unknown): string | undefined {
  if (!body) return undefined;
  const text =
    typeof body === "string" ? body : JSON.stringify(body).toLowerCase();
  for (const param of Object.keys(KNOWN_PARAM_VALUES)) {
    if (text.includes(param.toLowerCase())) return param;
  }
  return undefined;
}

/** Format a human- and LLM-readable error message with recovery guidance. */
export function formatErrorResponse(err: ApiError): string {
  const parts: string[] = [];

  switch (err.category) {
    case "rate_limit":
      parts.push("Rate limited (daily quota). Tokens refresh the next day.");
      break;
    case "auth_error":
      parts.push("Authentication failed. Check NEWSAPI_KEY is valid.");
      break;
    case "not_found":
      parts.push("No results found. Try broader search terms or check URIs.");
      break;
    case "api_error":
      parts.push(
        `Server error (HTTP ${err.status}, retryable). Try again shortly.`,
      );
      break;
    case "invalid_param": {
      const detail =
        typeof err.body === "string"
          ? err.body
          : typeof err.body === "object" && err.body !== null
            ? JSON.stringify(err.body)
            : "";
      parts.push(`Invalid request (HTTP 400): ${detail}`);

      const param = extractParamHint(err.body);
      if (param && KNOWN_PARAM_VALUES[param]) {
        parts.push(
          `Valid values for "${param}": ${KNOWN_PARAM_VALUES[param].join(", ")}`,
        );
      }
      break;
    }
    case "network_error":
      parts.push("Network error. Check connectivity and try again.");
      break;
  }

  if (err.isRetryable && err.category !== "rate_limit") {
    parts.push("This error is retryable.");
  }

  return parts.join("\n");
}

/** Format a non-API error (network failures, unexpected errors). */
export function formatUnknownError(err: unknown): string {
  if (err instanceof Error) {
    return `Network/unexpected error: ${err.message}`;
  }
  return `Unexpected error: ${String(err)}`;
}
