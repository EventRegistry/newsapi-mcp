# The hosted server keeps no MCP sessions

The hosted server runs MCP's HTTP transport without session IDs: every request
builds a fresh MCP server and carries the user's token in its own
`Authorization` header. Sessions would pin each client to one container's
memory, forcing sticky routing and dropping every client on each deploy, while
the tools are plain request/response and use none of the server-pushed
messages (progress, list-changed notices, mid-call questions) that sessions
enable.

## Consequences

- Any container can answer any request, so the service scales by adding
  replicas behind a plain load balancer.
- Adding server-pushed messages later means switching to sessions and adding
  sticky routing or a shared session store.
