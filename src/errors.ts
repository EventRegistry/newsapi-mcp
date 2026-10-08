import { authMode, isUnlinkedAccount } from "./client.js";
import { ApiError } from "./types.js";

/** Known param values for common fields, used in invalid_param suggestions. */
const KNOWN_PARAM_VALUES: Record<string, string[]> = {
  lang: [
    "ara",
    "bul",
    "cat",
    "ces",
    "dan",
    "deu",
    "ell",
    "eng",
    "est",
    "eus",
    "fin",
    "fra",
    "glg",
    "hbs",
    "heb",
    "hin",
    "hrv",
    "hun",
    "ind",
    "isl",
    "ita",
    "jpn",
    "kan",
    "kat",
    "kor",
    "lav",
    "lit",
    "mal",
    "mar",
    "msa",
    "nld",
    "nor",
    "pan",
    "pol",
    "por",
    "ron",
    "rus",
    "slk",
    "slv",
    "spa",
    "sqi",
    "srp",
    "swa",
    "swe",
    "tam",
    "tel",
    "tgl",
    "tha",
    "tur",
    "ukr",
    "urd",
    "vie",
    "zho",
    "zsm",
    "zul",
    "gle",
  ],
  articlesSortBy: [
    "date", // publishing date
    "rel", // relevance to the query
    "sourceImportance", // manually curated score of source importance - high value, high importance
    "sourceImportanceRank", // reverse of sourceImportance
    "sourceAlexaGlobalRank", // global rank of the news source
    "sourceAlexaCountryRank", // country rank of the news source
    "socialScore", // total shares on social media
    "facebookShares", // shares on Facebook only
  ],
  eventsSortBy: [
    "date", // by event date
    "rel", // relevance to the query
    "size", // number of articles in the event
    "socialScore" // amount of shares in social media
  ],
  isDuplicateFilter: ["keepAll", "skipDuplicates", "keepOnlyDuplicates"],
  keywordLoc: ["body", "title", "title,body"],
  keywordOper: ["and", "or"],
  dataType: [
    "news", // news content
    "pr", // press releases
    "blog" // blogs
  ],
};

/** Try to extract a param name from the API error body. */
function extractParamHint(body: unknown): string | undefined {
  if (!body) return undefined;
  const raw = typeof body === "string" ? body : JSON.stringify(body);
  const text = raw.toLowerCase();
  for (const param of Object.keys(KNOWN_PARAM_VALUES)) {
    const pattern = new RegExp(`\\b${param.toLowerCase()}\\b`);
    if (pattern.test(text)) return param;
  }
  return undefined;
}

/** The API's own reason for an error: OAuth error fields, else the raw body. */
function apiReason(body: unknown): string {
  if (typeof body === "object" && body !== null) {
    const { error, error_description } = body as Record<string, unknown>;
    const parts = [error, error_description].filter(
      (p): p is string => typeof p === "string" && p !== "",
    );
    if (parts.length > 0) return parts.join(": ");
    return JSON.stringify(body);
  }
  return typeof body === "string" ? body : "";
}

/** Auth guidance that fits how the request was authenticated. */
function authErrorMessage(err: ApiError): string {
  const mode = authMode();
  if (mode === "apiKey") {
    return "Authentication failed. Check NEWSAPI_KEY is valid.";
  }
  if (isUnlinkedAccount(err)) {
    return "No Event Registry account is linked to this login. Sign in once at https://eventregistry.org/login with the same account, then retry the request.";
  }
  if (err.status === 403) {
    const reason = apiReason(err.body);
    return `Your Event Registry account is not allowed to make this request (HTTP 403${reason ? `: ${reason}` : ""}). Check its plan and permissions at https://eventregistry.org.`;
  }
  if (mode === "login") {
    return "Your NewsAPI.ai login has expired or was revoked and could not be refreshed. Ask the user to run `npx newsapi-mcp login` to log in again, then retry the request.";
  }
  return "Your NewsAPI.ai login has expired or was revoked. Ask the user to reconnect the NewsAPI.ai server in their AI tool to log in again, then retry the request.";
}

/** Format a human- and LLM-readable error message with recovery guidance. */
export function formatErrorResponse(err: ApiError): string {
  const parts: string[] = [];

  switch (err.category) {
    case "rate_limit":
      parts.push("Rate limited (daily quota). Tokens refresh the next day.");
      break;
    case "auth_error":
      parts.push(authErrorMessage(err));
      break;
    case "not_found":
      parts.push("No results found. Try broader search terms or check URIs.");
      break;
    case "concurrent_limit":
      parts.push(
        "Too many simultaneous requests (HTTP 503). Event Registry allows max 5 concurrent requests. Make requests sequentially, one after the other.",
      );
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
