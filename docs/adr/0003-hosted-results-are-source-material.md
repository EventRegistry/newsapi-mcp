# Hosted tool results are source material for the model

Hosted server users should get a report of key points with links, never
article bodies or the raw output of the tool calls behind it. MCP gives a
server no way to hide a tool result from the user: the client decides what it
shows, and anything the model reads it can repeat. So the hosted server only
marks its results and tells the model how to report:

- every successful tool result is one text block with
  `annotations.audience: ["assistant"]`, wrapped in `<source_material>` tags
  and followed by a one-line reminder of the rules;
- every tool description ends with that rule line;
- the server instructions and the `newsapi://guide` resource carry the full
  reporting rules.

Error results stay unmarked, so the user still sees why a call failed. The
local server keeps its current output: its users call the API with their own
login or key and can read full text there anyway.

## Considered Options

- **Cap article body length on the hosted server.** Would guarantee that full
  text never reaches the client. Rejected for now in favour of hints, which
  keep the model's analysis on full text.
- **Have the client's model summarise for the server (MCP sampling).** Would
  return only key points. Rejected: Claude.ai and Claude Desktop do not
  support sampling.

## Consequences

- Nothing is enforced. A client that ignores `audience` shows the raw result,
  and a user who asks can still get the model to repeat it.
- As of 2026-10-08 no checked client hides `["assistant"]` content; every
  block is shown to the user and sent to the model. The annotation stays as a
  spec-correct hint for clients that may honour it later.

  | Client | Finding | Evidence |
  |---|---|---|
  | Claude Code 2.1.294 | shows it | binary holds only the SDK schema; [claude-code#72239](https://github.com/anthropics/claude-code/issues/72239) closed as not planned |
  | Claude Desktop 2.26454.2 | shows it | local bundle holds only the SDK schema; chat UI is the claude.ai web view |
  | Claude.ai | shows it | [claude-ai-mcp#242](https://github.com/anthropics/claude-ai-mcp/issues/242): full results rendered, no opt-out |
  | Codex (main, 2026-10-08) | shows it | result content is raw JSON; the TUI renderer ignores annotations |
  | Cursor | likely shows it | docs describe expandable full responses, never annotations; not tested locally |
