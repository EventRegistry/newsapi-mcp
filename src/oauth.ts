import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { Server } from "node:http";
import { homedir } from "node:os";
import { join } from "node:path";

const DEFAULT_ISSUER = "https://auth.id.eventregistry.org";
/** Public client registered with the issuer for this package. */
const DEFAULT_CLIENT_ID = "newsapi-mcp";
export const SCOPE = "mcp offline_access";
/** Loopback redirect ports registered with the issuer, tried in order. */
const REDIRECT_PORTS = [51337, 51338, 51339];
export const REDIRECT_PATH = "/callback";

// Treat a token as expired this long before the issuer does, to absorb clock skew.
const EXPIRY_MARGIN_MS = 60_000;
const DEFAULT_LOGIN_TIMEOUT_MS = 5 * 60_000;

export interface Tokens {
  accessToken: string;
  refreshToken?: string;
  /** Unix time in milliseconds. */
  expiresAt: number;
}

/** Where the login's tokens live between runs. */
export interface TokenStore {
  load(): Promise<Tokens | undefined>;
  save(tokens: Tokens): Promise<void>;
  clear(): Promise<void>;
}

/** Fetch the issuer's OpenID Connect discovery document. */
export async function discoverOpenId(
  issuer: string,
  fetchFn: typeof fetch = fetch,
): Promise<Record<string, unknown>> {
  const url = `${issuer.replace(/\/$/, "")}/.well-known/openid-configuration`;
  const res = await fetchFn(url);
  if (!res.ok) {
    throw new Error(`OpenID configuration at ${url} returned ${res.status}`);
  }
  return (await res.json()) as Record<string, unknown>;
}

function endpoint(doc: Record<string, unknown>, name: string): string {
  const value = doc[name];
  if (typeof value !== "string") {
    throw new Error(`OpenID configuration has no ${name}`);
  }
  return value;
}

/** Tokens in the OS credential store (keychain, Secret Service, Credential Manager). */
function keyringStore(): TokenStore {
  const SERVICE = "newsapi-mcp";
  const ACCOUNT = "oauth";
  const entry = async () => {
    const { AsyncEntry } = await import("@napi-rs/keyring");
    return new AsyncEntry(SERVICE, ACCOUNT);
  };
  return {
    async load() {
      const raw = await (await entry()).getPassword();
      return raw ? (JSON.parse(raw) as Tokens) : undefined;
    },
    async save(tokens) {
      await (await entry()).setPassword(JSON.stringify(tokens));
    },
    async clear() {
      await (await entry()).deletePassword();
    },
  };
}

/** Tokens in a user-only file; the fallback where no credential store exists. */
export function fileStore(path = defaultTokenPath()): TokenStore {
  return {
    async load() {
      try {
        return JSON.parse(await readFile(path, "utf8")) as Tokens;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return undefined;
        throw err;
      }
    },
    async save(tokens) {
      await mkdir(join(path, ".."), { recursive: true, mode: 0o700 });
      await writeFile(path, JSON.stringify(tokens), { mode: 0o600 });
    },
    async clear() {
      await rm(path, { force: true });
    },
  };
}

function defaultTokenPath(): string {
  const base =
    process.env.XDG_CONFIG_HOME ||
    (process.platform === "win32" && process.env.APPDATA) ||
    join(homedir(), ".config");
  return join(base, "newsapi-mcp", "tokens.json");
}

/** The credential store, falling back to the file when the OS has none. */
function systemStore(): TokenStore {
  const keyring = keyringStore();
  const file = fileStore();
  let active: Promise<TokenStore> | undefined;
  const pick = () =>
    (active ??= keyring
      .load()
      .then(() => keyring)
      .catch((err: unknown) => {
        console.error(
          `OS credential store unavailable (${(err as Error).message}); keeping tokens in ${defaultTokenPath()}`,
        );
        return file;
      }));
  return {
    load: async () => (await pick()).load(),
    save: async (tokens) => (await pick()).save(tokens),
    clear: async () => (await pick()).clear(),
  };
}

/** Open `url` in the user's default browser without waiting for it. */
export async function openBrowser(url: string): Promise<void> {
  const [cmd, args] =
    process.platform === "darwin"
      ? ["open", [url]]
      : process.platform === "win32"
        ? ["cmd", ["/c", "start", "", url.replaceAll("&", "^&")]]
        : ["xdg-open", [url]];
  await new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "ignore", detached: true });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

export interface OAuthOptions {
  store: TokenStore;
  issuer?: string;
  clientId?: string;
  ports?: number[];
  openBrowser?: (url: string) => Promise<void>;
  fetch?: typeof fetch;
  loginTimeoutMs?: number;
}

/**
 * Authorization-code + PKCE login as a public client, with tokens kept in a
 * store and refreshed one at a time (the issuer rotates refresh tokens).
 */
export class OAuthSession {
  private readonly store: TokenStore;
  private readonly issuer: string;
  private readonly clientId: string;
  private readonly ports: number[];
  private readonly open: (url: string) => Promise<void>;
  private readonly fetch: typeof fetch;
  private readonly loginTimeoutMs: number;
  private config?: Promise<{ authorizationEndpoint: string; tokenEndpoint: string }>;
  private held?: Tokens;
  private loaded = false;
  private inFlight?: Promise<Tokens>;

  constructor(options: OAuthOptions) {
    this.store = options.store;
    this.issuer = options.issuer ?? DEFAULT_ISSUER;
    this.clientId = options.clientId ?? DEFAULT_CLIENT_ID;
    this.ports = options.ports ?? REDIRECT_PORTS;
    this.open = options.openBrowser ?? openBrowser;
    this.fetch = options.fetch ?? fetch;
    this.loginTimeoutMs = options.loginTimeoutMs ?? DEFAULT_LOGIN_TIMEOUT_MS;
  }

  /** Valid tokens: the stored ones, refreshed ones, or a new login's. */
  async tokens(): Promise<Tokens> {
    const current = await this.current();
    if (current && current.expiresAt - EXPIRY_MARGIN_MS > Date.now()) {
      return current;
    }
    return this.renew(current);
  }

  /** Replace `rejected` (a token the API refused) by refreshing, else logging in. */
  async renew(rejected?: Tokens): Promise<Tokens> {
    // Join the renewal already running; a token it produced answers the call.
    this.inFlight ??= this.renewNow(rejected).finally(() => {
      this.inFlight = undefined;
    });
    return this.inFlight;
  }

  private async renewNow(rejected?: Tokens): Promise<Tokens> {
    const current = await this.current();
    if (current && current.accessToken !== rejected?.accessToken) return current;
    return current?.refreshToken
      ? this.refresh(current.refreshToken)
      : this.login();
  }

  /** The tokens the session currently holds, if any. */
  async current(): Promise<Tokens | undefined> {
    if (!this.loaded) {
      this.held = await this.store.load();
      this.loaded = true;
    }
    return this.held;
  }

  /** Run the browser login and store its tokens. */
  async login(): Promise<Tokens> {
    const { authorizationEndpoint } = await this.discover();
    const verifier = base64url(randomBytes(32));
    const state = base64url(randomBytes(16));
    const { server, redirectUri } = await listenOnLoopback(this.ports);
    try {
      const url = new URL(authorizationEndpoint);
      url.search = new URLSearchParams({
        response_type: "code",
        client_id: this.clientId,
        redirect_uri: redirectUri,
        scope: SCOPE,
        state,
        code_challenge: base64url(createHash("sha256").update(verifier).digest()),
        code_challenge_method: "S256",
      }).toString();
      console.error(`Opening your browser to log in to Event Registry:\n${url}`);
      await this.open(url.href);
      const code = await waitForCode(server, state, this.loginTimeoutMs);
      return await this.exchange({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      });
    } finally {
      server.close();
    }
  }

  /** Forget the stored tokens. */
  async logout(): Promise<void> {
    this.held = undefined;
    this.loaded = true;
    await this.store.clear();
  }

  private async refresh(refreshToken: string): Promise<Tokens> {
    try {
      return await this.exchange({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      });
    } catch (err) {
      // The refresh token is dead (rotated away or expired): start over.
      if (err instanceof TokenError && err.code === "invalid_grant") {
        await this.logout();
        return this.login();
      }
      throw err;
    }
  }

  private async exchange(params: Record<string, string>): Promise<Tokens> {
    const { tokenEndpoint } = await this.discover();
    const res = await this.fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: this.clientId, ...params }),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok || typeof body.access_token !== "string") {
      throw new TokenError(
        typeof body.error === "string" ? body.error : `http_${res.status}`,
        typeof body.error_description === "string"
          ? body.error_description
          : `Token request to ${tokenEndpoint} failed with ${res.status}`,
      );
    }
    const tokens: Tokens = {
      accessToken: body.access_token,
      // The issuer rotates refresh tokens; keep the old one only if none came back.
      refreshToken:
        typeof body.refresh_token === "string"
          ? body.refresh_token
          : params.refresh_token,
      expiresAt:
        Date.now() +
        (typeof body.expires_in === "number" ? body.expires_in : 0) * 1000,
    };
    this.held = tokens;
    this.loaded = true;
    await this.store.save(tokens);
    return tokens;
  }

  private discover() {
    this.config ??= discoverOpenId(this.issuer, this.fetch)
      .then((doc) => ({
        authorizationEndpoint: endpoint(doc, "authorization_endpoint"),
        tokenEndpoint: endpoint(doc, "token_endpoint"),
      }))
      .catch((err) => {
        this.config = undefined;
        throw err;
      });
    return this.config;
  }
}

/** An error answer from the token endpoint (RFC 6749 §5.2). */
class TokenError extends Error {
  constructor(
    public readonly code: string,
    description: string,
  ) {
    super(`${code}: ${description}`);
  }
}

/** Build the session the package uses: OS store, env overrides for the issuer. */
export function createSession(env: NodeJS.ProcessEnv = process.env): OAuthSession {
  return new OAuthSession({
    store: systemStore(),
    issuer: env.NEWSAPI_OAUTH_ISSUER,
    clientId: env.NEWSAPI_OAUTH_CLIENT_ID,
  });
}

function base64url(bytes: Buffer): string {
  return bytes.toString("base64url");
}

/** Bind the callback server to the first free registered port. */
async function listenOnLoopback(
  ports: number[],
): Promise<{ server: Server; redirectUri: string }> {
  const server = createServer();
  for (const port of ports) {
    const bound = await new Promise<boolean>((resolve, reject) => {
      const onError = (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE" || err.code === "EACCES") resolve(false);
        else reject(err);
      };
      server.once("error", onError);
      server.listen(port, "127.0.0.1", () => {
        server.off("error", onError);
        resolve(true);
      });
    });
    if (bound) {
      return { server, redirectUri: `http://127.0.0.1:${port}${REDIRECT_PATH}` };
    }
  }
  throw new Error(
    `No free login port: all of ${ports.join(", ")} are in use on 127.0.0.1`,
  );
}

/** Resolve with the authorization code once the browser is redirected back. */
function waitForCode(
  server: Server,
  state: string,
  timeoutMs: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Login timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);
    server.on("request", (req, res) => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      if (url.pathname !== REDIRECT_PATH) {
        res.writeHead(404).end();
        return;
      }
      const fail = (message: string) => {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end(page("Login failed", message));
        clearTimeout(timer);
        reject(new Error(message));
      };
      const error = url.searchParams.get("error");
      if (error) {
        fail(`${error}: ${url.searchParams.get("error_description") ?? ""}`);
        return;
      }
      const code = url.searchParams.get("code");
      if (!code || url.searchParams.get("state") !== state) {
        fail("The login response did not match this login attempt.");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(page("Logged in", "You can close this window and return to your AI tool."));
      clearTimeout(timer);
      resolve(code);
    });
  });
}

function page(title: string, message: string): string {
  return `<!doctype html><meta charset="utf-8"><title>NewsAPI.ai – ${title}</title><body style="font-family:system-ui;margin:3em"><h1>${title}</h1><p>${message}</p></body>`;
}
