import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import type { Server } from "node:http";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { apiPost, initClient, initLogin } from "../src/client.js";
import { formatErrorResponse } from "../src/errors.js";
import {
  OAuthSession,
  REDIRECT_PATH,
  SCOPE,
  fileStore,
} from "../src/oauth.js";
import type { TokenStore, Tokens } from "../src/oauth.js";
import { ApiError } from "../src/types.js";

const ISSUER = "https://auth.example.test";
const CLIENT_ID = "test-client";
const PORTS = [51937, 51938];

// The callback server is real; everything else goes through fake fetches.
const realFetch = globalThis.fetch;
const apiFetch = vi.fn();
vi.stubGlobal("fetch", apiFetch);

function memoryStore(initial?: Tokens): TokenStore & { tokens?: Tokens } {
  const store: TokenStore & { tokens?: Tokens } = {
    tokens: initial,
    async load() {
      return store.tokens;
    },
    async save(tokens) {
      store.tokens = tokens;
    },
    async clear() {
      store.tokens = undefined;
    },
  };
  return store;
}

/** A fake issuer: discovery plus a token endpoint that records its requests. */
function fakeIssuer() {
  const tokenRequests: URLSearchParams[] = [];
  let counter = 0;
  const issuer = {
    tokenRequests,
    tokenResponse: undefined as undefined | (() => { status: number; body: unknown }),
    fetch: vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url === `${ISSUER}/.well-known/openid-configuration`) {
        return Response.json({
          authorization_endpoint: `${ISSUER}/oauth2/auth`,
          token_endpoint: `${ISSUER}/oauth2/token`,
        });
      }
      if (url === `${ISSUER}/oauth2/token`) {
        tokenRequests.push(new URLSearchParams(String(init?.body)));
        if (issuer.tokenResponse) {
          const { status, body } = issuer.tokenResponse();
          return Response.json(body, { status });
        }
        counter += 1;
        return Response.json({
          access_token: `access-${counter}`,
          refresh_token: `refresh-${counter}`,
          expires_in: 1800,
          token_type: "bearer",
        });
      }
      throw new Error(`Unexpected request to ${url}`);
    }) as unknown as typeof fetch,
  };
  return issuer;
}

/** A browser that follows the redirect back with `code` straight away. */
function browser(code = "the-code", mutate?: (u: URL) => void) {
  const urls: URL[] = [];
  const open = async (href: string) => {
    const url = new URL(href);
    urls.push(url);
    const redirect = new URL(url.searchParams.get("redirect_uri")!);
    redirect.searchParams.set("code", code);
    redirect.searchParams.set("state", url.searchParams.get("state")!);
    mutate?.(redirect);
    // Don't await: the login resolves when this request lands.
    void realFetch(redirect).catch(() => {});
  };
  return { urls, open };
}

function session(
  store: TokenStore,
  issuer = fakeIssuer(),
  open = browser().open,
): OAuthSession {
  return new OAuthSession({
    store,
    issuer: ISSUER,
    clientId: CLIENT_ID,
    ports: PORTS,
    openBrowser: open,
    fetch: issuer.fetch,
    loginTimeoutMs: 2000,
  });
}

beforeEach(() => {
  apiFetch.mockReset();
});

describe("OAuthSession login", () => {
  it("runs the PKCE code flow against the loopback redirect", async () => {
    const store = memoryStore();
    const issuer = fakeIssuer();
    const b = browser();
    const tokens = await session(store, issuer, b.open).login();

    const auth = b.urls[0];
    expect(auth.origin + auth.pathname).toBe(`${ISSUER}/oauth2/auth`);
    const q = auth.searchParams;
    expect(q.get("response_type")).toBe("code");
    expect(q.get("client_id")).toBe(CLIENT_ID);
    expect(q.get("scope")).toBe(SCOPE);
    expect(q.get("code_challenge_method")).toBe("S256");
    expect(q.get("redirect_uri")).toBe(`http://127.0.0.1:${PORTS[0]}${REDIRECT_PATH}`);

    const exchange = issuer.tokenRequests[0];
    expect(exchange.get("grant_type")).toBe("authorization_code");
    expect(exchange.get("code")).toBe("the-code");
    expect(exchange.get("client_id")).toBe(CLIENT_ID);
    expect(exchange.get("redirect_uri")).toBe(q.get("redirect_uri"));
    expect(exchange.has("client_secret")).toBe(false);
    const challenge = createHash("sha256")
      .update(exchange.get("code_verifier")!)
      .digest("base64url");
    expect(challenge).toBe(q.get("code_challenge"));

    expect(tokens.accessToken).toBe("access-1");
    expect(tokens.refreshToken).toBe("refresh-1");
    expect(tokens.expiresAt).toBeGreaterThan(Date.now() + 1700_000);
    expect(store.tokens).toEqual(tokens);
  });

  it("falls back to the next registered port when the first is taken", async () => {
    const blocker: Server = createServer();
    await new Promise<void>((r) => blocker.listen(PORTS[0], "127.0.0.1", r));
    try {
      const b = browser();
      await session(memoryStore(), fakeIssuer(), b.open).login();
      expect(b.urls[0].searchParams.get("redirect_uri")).toBe(
        `http://127.0.0.1:${PORTS[1]}${REDIRECT_PATH}`,
      );
    } finally {
      await new Promise((r) => blocker.close(r));
    }
  });

  it("rejects a callback whose state does not match", async () => {
    const store = memoryStore();
    const b = browser("the-code", (u) => u.searchParams.set("state", "forged"));
    await expect(session(store, fakeIssuer(), b.open).login()).rejects.toThrow(
      /did not match/,
    );
    expect(store.tokens).toBeUndefined();
  });

  it("surfaces the issuer's error from the callback", async () => {
    const b = browser("the-code", (u) => {
      u.searchParams.delete("code");
      u.searchParams.set("error", "access_denied");
      u.searchParams.set("error_description", "User cancelled");
    });
    await expect(session(memoryStore(), fakeIssuer(), b.open).login()).rejects.toThrow(
      "access_denied: User cancelled",
    );
  });

  it("times out when the browser never comes back", async () => {
    const s = new OAuthSession({
      store: memoryStore(),
      issuer: ISSUER,
      ports: PORTS,
      openBrowser: async () => {},
      fetch: fakeIssuer().fetch,
      loginTimeoutMs: 50,
    });
    await expect(s.login()).rejects.toThrow(/timed out/);
  });
});

describe("OAuthSession tokens", () => {
  const valid: Tokens = {
    accessToken: "stored",
    refreshToken: "stored-refresh",
    expiresAt: Date.now() + 600_000,
  };
  const expired: Tokens = { ...valid, expiresAt: Date.now() + 10_000 };

  it("returns stored tokens while they are valid", async () => {
    const issuer = fakeIssuer();
    const tokens = await session(memoryStore(valid), issuer).tokens();
    expect(tokens.accessToken).toBe("stored");
    expect(issuer.tokenRequests).toHaveLength(0);
  });

  it("refreshes expired tokens and stores the rotated refresh token", async () => {
    const store = memoryStore(expired);
    const issuer = fakeIssuer();
    const tokens = await session(store, issuer).tokens();
    expect(tokens.accessToken).toBe("access-1");
    expect(tokens.refreshToken).toBe("refresh-1");
    expect(issuer.tokenRequests[0].get("grant_type")).toBe("refresh_token");
    expect(issuer.tokenRequests[0].get("refresh_token")).toBe("stored-refresh");
    expect(issuer.tokenRequests[0].get("client_id")).toBe(CLIENT_ID);
    expect(store.tokens).toEqual(tokens);
  });

  it("keeps the old refresh token when the issuer sends none", async () => {
    const issuer = fakeIssuer();
    issuer.tokenResponse = () => ({
      status: 200,
      body: { access_token: "new", expires_in: 60 },
    });
    const tokens = await session(memoryStore(expired), issuer).tokens();
    expect(tokens.refreshToken).toBe("stored-refresh");
  });

  it("runs one refresh for concurrent callers", async () => {
    const issuer = fakeIssuer();
    const s = session(memoryStore(expired), issuer);
    const results = await Promise.all([s.tokens(), s.tokens(), s.renew(expired)]);
    expect(issuer.tokenRequests).toHaveLength(1);
    expect(new Set(results.map((t) => t.accessToken))).toEqual(new Set(["access-1"]));
  });

  it("renew returns the current tokens when the rejected ones were already replaced", async () => {
    const issuer = fakeIssuer();
    const s = session(memoryStore(valid), issuer);
    const stale: Tokens = { ...valid, accessToken: "older" };
    expect((await s.renew(stale)).accessToken).toBe("stored");
    expect(issuer.tokenRequests).toHaveLength(0);
  });

  it("logs in again when the refresh token is dead", async () => {
    const issuer = fakeIssuer();
    let calls = 0;
    issuer.tokenResponse = () =>
      ++calls === 1
        ? { status: 400, body: { error: "invalid_grant" } }
        : { status: 200, body: { access_token: "fresh", refresh_token: "r", expires_in: 60 } };
    const b = browser();
    const tokens = await session(memoryStore(expired), issuer, b.open).tokens();
    expect(b.urls).toHaveLength(1);
    expect(issuer.tokenRequests.map((r) => r.get("grant_type"))).toEqual([
      "refresh_token",
      "authorization_code",
    ]);
    expect(tokens.accessToken).toBe("fresh");
  });

  it("logs in when nothing is stored", async () => {
    const b = browser();
    const tokens = await session(memoryStore(), fakeIssuer(), b.open).tokens();
    expect(b.urls).toHaveLength(1);
    expect(tokens.accessToken).toBe("access-1");
  });

  it("logout clears the store", async () => {
    const store = memoryStore(valid);
    const s = session(store);
    await s.logout();
    expect(store.tokens).toBeUndefined();
    expect(await s.current()).toBeUndefined();
  });
});

describe("fileStore", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "newsapi-mcp-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("round-trips tokens in a user-only file", async () => {
    const path = join(dir, "nested", "tokens.json");
    const store = fileStore(path);
    expect(await store.load()).toBeUndefined();
    const tokens: Tokens = { accessToken: "a", refreshToken: "r", expiresAt: 1 };
    await store.save(tokens);
    expect(await store.load()).toEqual(tokens);
    if (process.platform !== "win32") {
      expect((await stat(path)).mode & 0o777).toBe(0o600);
    }
    await store.clear();
    expect(await store.load()).toBeUndefined();
  });
});

describe("client with a login", () => {
  const valid: Tokens = {
    accessToken: "stored",
    refreshToken: "stored-refresh",
    expiresAt: Date.now() + 600_000,
  };

  function apiResponse(status: number, body: unknown) {
    return {
      ok: status < 400,
      status,
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
      headers: { get: () => null },
    };
  }

  afterEach(() => {
    initClient("test-key");
  });

  it("sends the bearer token and no apiKey", async () => {
    initLogin(session(memoryStore(valid)));
    apiFetch.mockResolvedValue(apiResponse(200, { ok: true }));
    await apiPost("/article/getArticles", { keyword: "x" });
    const [, init] = apiFetch.mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer stored");
    expect(JSON.parse(init.body)).toEqual({ keyword: "x" });
  });

  it("refreshes once and retries on 401", async () => {
    const issuer = fakeIssuer();
    initLogin(session(memoryStore(valid), issuer));
    apiFetch
      .mockResolvedValueOnce(apiResponse(401, { error: "invalid_token" }))
      .mockResolvedValueOnce(apiResponse(200, { ok: true }));
    const res = await apiPost("/article/getArticles", {});
    expect(res.data).toEqual({ ok: true });
    expect(issuer.tokenRequests[0].get("refresh_token")).toBe("stored-refresh");
    expect(apiFetch.mock.calls[1][1].headers.Authorization).toBe("Bearer access-1");
  });

  it("gives up after the retried request is refused too", async () => {
    initLogin(session(memoryStore(valid)));
    apiFetch.mockResolvedValue(apiResponse(401, "unauthorized"));
    await expect(apiPost("/article/getArticles", {})).rejects.toMatchObject({
      status: 401,
    });
    expect(apiFetch).toHaveBeenCalledTimes(2);
  });

  it("does not refresh when no Event Registry account is linked", async () => {
    const issuer = fakeIssuer();
    initLogin(session(memoryStore(valid), issuer));
    apiFetch.mockResolvedValue(
      apiResponse(401, {
        error: "invalid_token",
        error_description: "No Event Registry account is linked to this login",
      }),
    );
    await expect(apiPost("/article/getArticles", {})).rejects.toBeInstanceOf(ApiError);
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(issuer.tokenRequests).toHaveLength(0);
  });

  it("formats a 401 as a login-again message", () => {
    initLogin(session(memoryStore(valid)));
    const msg = formatErrorResponse(new ApiError(401, "unauthorized"));
    expect(msg).toContain("npx newsapi-mcp login");
    expect(msg).not.toContain("NEWSAPI_KEY");
  });

  it("formats an unlinked account as a sign-in message", () => {
    initLogin(session(memoryStore(valid)));
    const msg = formatErrorResponse(
      new ApiError(401, { error_description: "No Event Registry account is linked" }),
    );
    expect(msg).toContain("https://eventregistry.org/login");
  });
});
