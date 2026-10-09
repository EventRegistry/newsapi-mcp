import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { InvalidTokenError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
import type { OAuthTokenVerifier } from "@modelcontextprotocol/sdk/server/auth/provider.js";
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
  type CryptoKey,
  type JWTPayload,
} from "jose";
import {
  createHttpApp,
  createJwtVerifier,
  discoverJwksUri,
  loadConfig,
} from "../src/http.js";

// Real fetch talks to the local test server; the stub stands in for NewsAPI.ai.
const realFetch = globalThis.fetch;
const fetchSpy = vi.fn();
vi.stubGlobal("fetch", fetchSpy);

const PUBLIC_URL = "https://mcp.example.test/mcp";
const ISSUER = "https://auth.example.test";

let signingKey: CryptoKey;
let otherKey: CryptoKey;
let verifier: OAuthTokenVerifier;

/** Sign an access token; claims override the valid defaults. */
function sign(claims: JWTPayload = {}, key = signingKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    iss: ISSUER,
    aud: PUBLIC_URL,
    sub: "user-1",
    client_id: "test-client",
    scope: "mcp offline_access",
    iat: now,
    exp: now + 3600,
    ...claims,
  })
    .setProtectedHeader({ alg: "RS256", kid: "k1" })
    .sign(key);
}

let httpServer: Server;
let baseUrl: string;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  signingKey = pair.privateKey;
  otherKey = (await generateKeyPair("RS256")).privateKey;
  const jwk = { ...(await exportJWK(pair.publicKey)), kid: "k1", alg: "RS256" };
  verifier = createJwtVerifier({
    issuer: ISSUER,
    audience: PUBLIC_URL,
    jwks: createLocalJWKSet({ keys: [jwk] }),
  });
  const app = createHttpApp({
    publicUrl: new URL(PUBLIC_URL),
    issuer: ISSUER,
    verifier,
  });
  httpServer = app.listen(0);
  await new Promise((r) => httpServer.once("listening", r));
  baseUrl = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise((r) => httpServer.close(r));
});

beforeEach(() => {
  fetchSpy.mockReset();
});

function mockApiOk(data: unknown) {
  fetchSpy.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
    headers: { get: () => null },
  });
}

async function connect(token: string): Promise<Client> {
  const client = new Client({ name: "test-client", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(
    new URL(`${baseUrl}/mcp`),
    {
      fetch: realFetch,
      requestInit: { headers: { Authorization: `Bearer ${token}` } },
    },
  );
  await client.connect(transport);
  return client;
}

describe("loadConfig", () => {
  it("uses defaults when env is empty", () => {
    const config = loadConfig({});
    expect(config.publicUrl.href).toBe("https://mcp.newsapi.ai/mcp");
    expect(config.issuer).toBe("https://auth.id.eventregistry.org");
    expect(config.port).toBe(3000);
  });

  it("reads overrides from env", () => {
    const config = loadConfig({
      MCP_PUBLIC_URL: "https://news.example.org/x",
      MCP_AUTH_ISSUER: "https://login.example.org",
      PORT: "8080",
    });
    expect(config.publicUrl.href).toBe("https://news.example.org/x");
    expect(config.issuer).toBe("https://login.example.org");
    expect(config.port).toBe(8080);
  });

  it("rejects a PORT that is not a port number", () => {
    expect(() => loadConfig({ PORT: "abc" })).toThrow(/PORT/);
  });
});

describe("hosted server HTTP endpoints", () => {
  it("answers /healthz", async () => {
    const res = await realFetch(`${baseUrl}/healthz`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it.each([
    "/.well-known/oauth-protected-resource/mcp",
    "/.well-known/oauth-protected-resource",
  ])("serves protected-resource metadata at %s", async (path) => {
    const res = await realFetch(`${baseUrl}${path}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      resource: PUBLIC_URL,
      authorization_servers: [ISSUER],
      scopes_supported: ["mcp", "offline_access"],
    });
  });

  it("returns 401 with WWW-Authenticate when no token is sent", async () => {
    const res = await realFetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toContain(
      'resource_metadata="https://mcp.example.test/.well-known/oauth-protected-resource/mcp"',
    );
  });

  it("returns 401 for a rejected token", async () => {
    const res = await realFetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer nope",
      },
      body: "{}",
    });
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toContain("invalid_token");
  });

  it("rejects GET on the MCP endpoint (no sessions)", async () => {
    const res = await realFetch(`${baseUrl}/mcp`, {
      headers: { Authorization: `Bearer ${await sign()}` },
    });
    expect(res.status).toBe(405);
  });
});

describe("hosted server MCP over HTTP", () => {
  it("lists tools with a valid token", async () => {
    const client = await connect(await sign());
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(8);
    await client.close();
  });

  it("calls a tool with the caller's token and no apiKey", async () => {
    mockApiOk([{ uri: "http://en.wikipedia.org/wiki/Tesla", label: "Tesla" }]);
    const token = await sign();
    const client = await connect(token);
    await client.callTool({
      name: "suggest",
      arguments: { type: "concepts", prefix: "Tesla" },
    });
    await client.close();

    const init = fetchSpy.mock.calls[0][1];
    expect(init.headers.Authorization).toBe(`Bearer ${token}`);
    expect(JSON.parse(init.body)).not.toHaveProperty("apiKey");
  });

  it("keeps two concurrent callers' tokens apart", async () => {
    mockApiOk({ articles: { results: [], totalResults: 0 } });
    const tokenA = await sign({ sub: "a" });
    const tokenB = await sign({ sub: "b" });
    const [a, b] = await Promise.all([connect(tokenA), connect(tokenB)]);
    await Promise.all([
      a.callTool({ name: "search", arguments: { kind: "articles", keyword: "a" } }),
      b.callTool({ name: "search", arguments: { kind: "articles", keyword: "b" } }),
    ]);
    await Promise.all([a.close(), b.close()]);

    const byKeyword = Object.fromEntries(
      fetchSpy.mock.calls.map(([, init]) => [
        JSON.parse(init.body).keyword,
        init.headers.Authorization,
      ]),
    );
    expect(byKeyword).toEqual({ a: `Bearer ${tokenA}`, b: `Bearer ${tokenB}` });
  });
});

describe("hosted server API errors", () => {
  it("maps an unlinked account to the sign-in message", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 401,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            error: "invalid_token",
            error_description: "No Event Registry account is linked",
          }),
        ),
    });
    const client = await connect(await sign());
    const result = await client.callTool({
      name: "get_api_usage",
      arguments: {},
    });
    await client.close();

    expect(result.isError).toBe(true);
    const [content] = result.content as { text: string }[];
    expect(content.text).toContain("https://eventregistry.org");
  });
});

describe("createJwtVerifier", () => {
  it("accepts a valid token and reports its scopes and expiry", async () => {
    const token = await sign();
    const info = await verifier.verifyAccessToken(token);
    expect(info).toMatchObject({
      token,
      clientId: "test-client",
      scopes: ["mcp", "offline_access"],
    });
    expect(info.expiresAt).toBeGreaterThan(Date.now() / 1000);
  });

  it("reads scopes from an Ory Hydra scp array", async () => {
    const token = await sign({ scope: undefined, scp: ["mcp", "offline_access"] });
    const info = await verifier.verifyAccessToken(token);
    expect(info.scopes).toEqual(["mcp", "offline_access"]);
  });

  it.each([
    ["wrong audience", { aud: "https://other.example.test/mcp" }],
    ["wrong issuer", { iss: "https://evil.example.test" }],
    ["expired", { exp: Math.floor(Date.now() / 1000) - 60 }],
    ["missing expiry", { exp: undefined }],
  ])("rejects a token with %s", async (_label, claims) => {
    await expect(
      verifier.verifyAccessToken(await sign(claims)),
    ).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it("rejects a token signed by another key", async () => {
    await expect(
      verifier.verifyAccessToken(await sign({}, otherKey)),
    ).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it("rejects a malformed token", async () => {
    await expect(verifier.verifyAccessToken("not.a.jwt")).rejects.toBeInstanceOf(
      InvalidTokenError,
    );
  });

  it("keeps WWW-Authenticate well-formed when the reason contains quotes", async () => {
    const token = await sign({ exp: Math.floor(Date.now() / 1000) - 60 });
    const res = await realFetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: "{}",
    });
    const header = res.headers.get("www-authenticate") ?? "";
    const description = header.match(/error_description="([^"]*)"/)?.[1];
    expect(description).toContain("'exp' claim");
    expect(header).toMatch(/error_description="[^"]*", resource_metadata=/);
  });

  it("answers 401 over HTTP for a token with the wrong audience", async () => {
    const token = await sign({ aud: "https://other.example.test/mcp" });
    const res = await realFetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: "{}",
    });
    expect(res.status).toBe(401);
  });
});

describe("discoverJwksUri", () => {
  it("reads jwks_uri from the issuer's OpenID configuration", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ issuer: ISSUER, jwks_uri: `${ISSUER}/jwks` }),
    });
    const uri = await discoverJwksUri(ISSUER);
    expect(fetchSpy).toHaveBeenCalledWith(
      `${ISSUER}/.well-known/openid-configuration`,
    );
    expect(uri.href).toBe(`${ISSUER}/jwks`);
  });

  it("throws when the configuration has no jwks_uri", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ issuer: ISSUER }),
    });
    await expect(discoverJwksUri(ISSUER)).rejects.toThrow(/jwks_uri/);
  });

  it("throws when the issuer answers with an error", async () => {
    fetchSpy.mockResolvedValue({ ok: false, status: 503 });
    await expect(discoverJwksUri(ISSUER)).rejects.toThrow(/503/);
  });
});
