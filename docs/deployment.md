# Deploying the hosted server

The hosted server (`src/http.ts`) serves the same tools as the npm package over
MCP's Streamable HTTP transport. It ships as a Docker image built from this
repo, keeps no sessions, and lets the MCP client log the user in at Event
Registry's auth server. The server only
verifies each request's access token and forwards it to NewsAPI.ai.

## Prerequisites

- Docker (or Node 22 to run the bundle directly).
- A public HTTPS URL for the server, e.g. `https://mcp.example.org/mcp`.
- An OAuth issuer that:
  - publishes `/.well-known/openid-configuration` with a `jwks_uri`;
  - issues JWT access tokens signed by those keys, with `iss` set to the
    issuer, `aud` set to the public URL, and an `exp` claim;
  - lets MCP clients register themselves (dynamic client registration) or has
    them pre-registered, with the `mcp` and `offline_access` scopes.

  The default issuer is `https://auth.id.eventregistry.org`.

## Configuration

All configuration is read from environment variables at startup.

| Variable | Default | Meaning |
|----------|---------|---------|
| `MCP_PUBLIC_URL` | `https://mcp.newsapi.ai/mcp` | URL clients connect to. Its path is the MCP route; tokens must carry it as `aud`. |
| `MCP_AUTH_ISSUER` | `https://auth.id.eventregistry.org` | OAuth issuer. Its OpenID discovery document gives the JWKS used to verify tokens. |
| `PORT` | `3000` | Port to listen on. |

No API key is needed: every call to NewsAPI.ai carries the caller's own token.

## Build and run

### Docker

```bash
docker build -t newsapi-mcp-hosted .
docker run -p 3000:3000 \
  -e MCP_PUBLIC_URL=https://mcp.example.org/mcp \
  newsapi-mcp-hosted
```

The image is a two-stage build: `npm run build:http` bundles `src/http.ts` into
`dist/http.js`, and the runtime stage carries only that file on `node:22-alpine`,
running as the `node` user. It declares a `HEALTHCHECK` against `/healthz`.

### Without Docker

```bash
npm ci
npm run build:http
MCP_PUBLIC_URL=https://mcp.example.org/mcp node dist/http.js
```

## Endpoints

| Path | Purpose |
|------|---------|
| `POST <MCP_PUBLIC_URL path>` (default `/mcp`) | MCP endpoint. Requires `Authorization: Bearer <token>`. Other methods answer `405`. |
| `GET /.well-known/oauth-protected-resource/<path>` and `GET /.well-known/oauth-protected-resource` | RFC 9728 metadata pointing clients at the issuer. |
| `GET /healthz` | Liveness check, answers `{"status":"ok"}`. |

A request without a valid token gets `401` with a `WWW-Authenticate` header that
names the metadata URL, which is how MCP clients find the issuer and start the
login.

## Reverse proxy and TLS

Terminate TLS in front of the container and forward the whole origin. The MCP
clients discover the issuer through the `/.well-known/` paths at the root of the
public origin, so the proxy must expose them alongside the MCP path. Set
`MCP_PUBLIC_URL` to exactly what clients will type: scheme, host, and path all
feed into the `aud` check and the metadata URLs.

## Scaling

The server is stateless: every request builds a fresh MCP server and carries its
own token. Run as many replicas as needed behind a plain load balancer; no
sticky routing or shared store is required. Each replica discovers the issuer's
JWKS on its first request and caches it; if discovery fails it retries on the
next request.

## Verifying a deployment

```bash
# Liveness
curl https://mcp.example.org/healthz
# {"status":"ok"}

# Metadata
curl https://mcp.example.org/.well-known/oauth-protected-resource/mcp
# {"resource":"https://mcp.example.org/mcp","authorization_servers":["https://auth.id.eventregistry.org"],...}

# Auth challenge
curl -i -X POST https://mcp.example.org/mcp
# HTTP/1.1 401 ... WWW-Authenticate: Bearer resource_metadata="https://mcp.example.org/.well-known/oauth-protected-resource/mcp"
```

Then connect a client and complete the login it opens:

```bash
claude mcp add --transport http newsapi https://mcp.example.org/mcp
```

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| `401` with a reason mentioning `aud` | `MCP_PUBLIC_URL` differs from the URL the token was issued for. |
| `401` with a reason mentioning `iss` or signature | Token comes from a different issuer than `MCP_AUTH_ISSUER`. |
| `405` on the MCP path | Client sent `GET`/`DELETE`; the server is stateless and accepts `POST` only. |
| `500` with "Error handling MCP request" in logs | Issuer unreachable, or its discovery document has no `jwks_uri`. |
| NewsAPI.ai answers that no account is linked | The user has no Event Registry account yet; sign in once at [eventregistry.org/login](https://eventregistry.org/login). |

Logs go to stderr; the startup line reports the port and public URL.
