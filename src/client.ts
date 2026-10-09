import { AsyncLocalStorage } from "node:async_hooks";
import type { OAuthSession, Tokens } from "./oauth.js";
import { ApiError } from "./types.js";
import type { ApiResponse, TokenUsage } from "./types.js";

const BASE_URL = "https://eventregistry.org/api/v1";

let apiKey: string | undefined;
// Browser login of the local server; refreshes its own tokens.
let session: OAuthSession | undefined;

// Per-request bearer token of the hosted server's caller.
const accessToken = new AsyncLocalStorage<string>();

/** Initialize the client with an API key. Must be called before any requests. */
export function initClient(key: string): void {
  apiKey = key;
  session = undefined;
}

/** Initialize the client with a browser login instead of an API key. */
export function initLogin(login: OAuthSession): void {
  session = login;
  apiKey = undefined;
}

/** Run `fn` so that every API request inside it authenticates with `token`. */
export function withAccessToken<T>(token: string, fn: () => T): T {
  return accessToken.run(token, fn);
}

/** How the current request authenticates with the API. */
export function authMode(): "hosted" | "login" | "apiKey" {
  if (accessToken.getStore() !== undefined) return "hosted";
  return session ? "login" : "apiKey";
}

// The API answers this when the login has no Event Registry account behind it.
const UNLINKED_ACCOUNT = /no event registry account is linked/i;

/** Whether the API refused this token for good, so a refresh cannot help. */
export function isUnlinkedAccount(err: ApiError): boolean {
  const body = typeof err.body === "string" ? err.body : JSON.stringify(err.body);
  return UNLINKED_ACCOUNT.test(body ?? "");
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

/** The error body as JSON when it parses, else as text. */
async function parseErrorBody(res: Response): Promise<unknown> {
  const text = await res.text().catch(() => "");
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
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
  const hosted = accessToken.getStore();
  if (!hosted && !session && !apiKey) {
    throw new Error("Client not initialized. Call initClient() first.");
  }
  let login: Tokens | undefined;
  let token = hosted;
  if (!token && session) {
    login = await session.tokens();
    token = login.accessToken;
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  // Inject the credential and strip undefined values
  const payload: Record<string, unknown> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  else payload.apiKey = apiKey;
  for (const [k, v] of Object.entries(body)) {
    if (v !== undefined) payload[k] = v;
  }

  const send = () =>
    fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
  let res = await send();

  if (!res.ok) {
    const err = new ApiError(res.status, await parseErrorBody(res));
    // A login's token may have just been revoked: renew it once and retry.
    if (res.status !== 401 || !login || !session || isUnlinkedAccount(err)) {
      throw err;
    }
    headers.Authorization = `Bearer ${(await session.renew(login)).accessToken}`;
    res = await send();
    if (!res.ok) throw new ApiError(res.status, await parseErrorBody(res));
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
