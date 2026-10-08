# Users log in through Event Registry's auth server

Both servers call the API with bearer tokens from `auth.id.eventregistry.org`
(authorization code + PKCE S256, scope `mcp offline_access`), so the user's
Event Registry account, not an API key, owns the usage. Who runs the flow
depends on where the server runs:

- **Hosted server**: the MCP client (Claude, Codex, Cursor, claude.ai) runs
  the login itself, as it does for any remote MCP server, and registers its
  own client. The server only verifies the token. This is the one path that
  reaches web apps and cloud sessions.
- **Local server**: the npm package runs the login itself as a public client
  registered by Event Registry: it opens the system browser, receives the
  code on a fixed loopback redirect (`http://127.0.0.1:<port>/callback`,
  ports 51337–51339), exchanges it, and keeps the tokens in the OS credential
  store through `@napi-rs/keyring` (a user-only file where no store exists).
  Refresh tokens rotate, so one refresh runs at a time and callers join it; a
  401 renews the token once and retries, except when the API says no Event
  Registry account is linked, which only a sign-in on the website fixes.
  `NEWSAPI_KEY` still selects API-key mode.

## Considered Options

- **API keys only on the local server**, leaving login to the hosted server.
  Rejected: Event Registry wants the package to work on a login too, with a
  single pre-registered client and no API key handling by users.

## Consequences

- `@napi-rs/keyring` is the package's one runtime dependency (prebuilt native
  binaries, left external by the single-file bundle). Platforms without a
  binary fall back to the token file.
