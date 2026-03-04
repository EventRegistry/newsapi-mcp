import { ApiError } from "./types.js";
import type { ApiResponse, TokenUsage } from "./types.js";

const BASE_URL = "https://eventregistry.org/api/v1";

let apiKey: string;

/** Initialize the client with an API key. Must be called before any requests. */
export function initClient(key: string): void {
  apiKey = key;
}

/** Parse a param that can be a single value, comma-separated string, or JSON array. */
export function parseArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return value.map(String);
  const s = String(value).trim();
  if (s.startsWith("[")) {
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.map(String);
      return [String(parsed)];
    } catch {
      // fall through to comma split
    }
  }
  if (/https?:\/\//.test(s)) {
    return s.split(/,(?=\s*https?:\/\/)/).map((v) => v.trim());
  }
  return s.split(",").map((v) => v.trim());
}

/** Make a POST request to the main Event Registry API. */
export async function apiPost(
  path: string,
  body: Record<string, unknown>,
): Promise<ApiResponse> {
  return request(`${BASE_URL}${path}`, body);
}

/** Extract token usage from response headers, if present. */
function parseTokenUsage(headers: Headers): TokenUsage | undefined {
  const reqTokens = headers.get("req-tokens");
  const remaining = headers.get("x-ratelimit-remaining");
  if (reqTokens == null && remaining == null) return undefined;
  return {
    reqTokens: reqTokens ? parseFloat(reqTokens) : 0,
    remaining: remaining ? parseFloat(remaining) : 0,
  };
}

async function request(
  url: string,
  body: Record<string, unknown>,
): Promise<ApiResponse> {
  if (!apiKey) {
    throw new Error("Client not initialized. Call initClient() first.");
  }
  // Inject API key and strip undefined values
  const payload: Record<string, unknown> = { apiKey };
  for (const [k, v] of Object.entries(body)) {
    if (v !== undefined) payload[k] = v;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
    throw new ApiError(res.status, parsed);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new ApiError(502, "Response body is not valid JSON");
  }
  const tokenUsage = parseTokenUsage(res.headers);
  return { data, tokenUsage };
}
