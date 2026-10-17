# NewsAPI.ai MCP Server

[![npm version](https://img.shields.io/npm/v/newsapi-mcp)](https://www.npmjs.com/package/newsapi-mcp)
[![npm downloads](https://img.shields.io/npm/dm/newsapi-mcp)](https://www.npmjs.com/package/newsapi-mcp)
[![Tests](https://github.com/EventRegistry/newsapi-mcp/actions/workflows/test.yml/badge.svg)](https://github.com/EventRegistry/newsapi-mcp/actions/workflows/test.yml)
[![Node 20+](https://img.shields.io/node/v/newsapi-mcp)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Streamable_HTTP_%2B_stdio-blue)](https://modelcontextprotocol.io)
[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Ask your AI assistant about the news. NewsAPI.ai MCP Server connects Claude, Cursor,
Codex and other AI tools to [NewsAPI.ai](https://newsapi.ai/), a news API developed and
operated by [Event Registry](https://eventregistry.org/): 150,000+ sources in 100+
languages, searched as articles, events (clusters of articles about one story) and
mentions (sentences that state a happening such as an acquisition or a recall).

[Homepage](https://newsapi.ai/) · [Documentation](https://newsapi.ai/documentation?tab=introduction) ·
[Register](https://newsapi.ai/register) · [Terms of Service](https://newsapi.ai/terms)

Use of the data is subject to the [NewsAPI.ai Terms of Service](https://newsapi.ai/terms).

## Connect in two minutes

You need a [NewsAPI.ai account](https://newsapi.ai/register) (free tier
included). No download, no API key: add the server address to your AI tool and log in
when it asks.

```
https://mcp.newsapi.ai/mcp
```

<details open>
<summary><strong>Claude Desktop and claude.ai</strong></summary>

1. Open **Customize → Connectors → + Add → Add custom connector**.
2. Name: `NewsAPI.ai`. URL: `https://mcp.newsapi.ai/mcp`. Save.
3. Click **Connect**: a browser window opens at Event Registry. Log in and allow access.

The connector shows as connected. Start a new chat and ask a news question.

If Claude answers from web search instead, check that the connector is switched on for
the chat: in the chat box open **+ → Connectors** and make sure `NewsAPI.ai` is on
(connectors are usually on by default):

![Enable the connector in the chat's Connectors menu](docs/images/claude-desktop-enable-connector.png)

</details>

<details>
<summary><strong>Claude Code</strong></summary>

```bash
claude mcp add --transport http --scope user newsapi https://mcp.newsapi.ai/mcp
```

`--scope user` makes the server available in every project; drop it to add it to the
current project only. Ask a news question and Claude Code prompts you to log in, or run
`/mcp` to log in up front. The first tool call asks for permission: choose "always allow"
(or add `mcp__newsapi` under `/permissions`) so later calls run without a prompt. For the research skills (`/newsapi:news`, `/newsapi:due-diligence`, …) install the
[plugin](#claude-code-plugin) instead.

</details>

<details>
<summary><strong>Codex</strong></summary>

```bash
codex mcp add newsapi --url https://mcp.newsapi.ai/mcp
codex mcp login newsapi
```

</details>

<details>
<summary><strong>Cursor</strong></summary>

Add to `~/.cursor/mcp.json` (or `.cursor/mcp.json` in a project):

```json
{
  "mcpServers": {
    "newsapi": {
      "url": "https://mcp.newsapi.ai/mcp"
    }
  }
}
```

</details>

<details>
<summary><strong>Other MCP clients</strong></summary>

Any client that supports Streamable HTTP with OAuth login works: add the URL
`https://mcp.newsapi.ai/mcp` as a remote server and complete the login the client opens.
If your client only runs local servers, use the [local server](docs/local-server.md).

</details>

### Your first question

Try one of these in a new chat:

- What happened with the EU AI Act this week?
- What are the biggest news stories globally right now?
- Which companies announced layoffs in the last 7 days?
- How did German media cover the EU budget talks?

The assistant resolves the names you mention, searches, reviews the relevant article information
and answers with links to its sources. [How to ask](docs/how-to-ask.md) explains what the
server can and cannot answer and how to phrase a question for the best result.

### Cost and usage

Every account has a budget of API tokens. Looking up names is free; each search or
lookup costs a few tokens, and searches that reach further back than the last 30 days
cost more. The official rates per request are in the Tokens section of
[newsapi.ai/plans](https://newsapi.ai/plans#faq). Each tool result carries the cost and
the remaining balance, and you can ask "how many API tokens do I have left?" at any time.

### Troubleshooting

| What you see | What to do |
|--------------|------------|
| "No Event Registry account is linked to this login" | Sign in once at [eventregistry.org/login](https://eventregistry.org/login) with the same account you used in the login window, then retry. |
| The login window opens again and again | Your login expired. Disconnect and reconnect the server in your AI tool (Claude Desktop: Connectors → NewsAPI.ai → Disconnect, then Connect; Claude Code: `/mcp` → newsapi → Reauthenticate). |
| The assistant says the tool is not available, or answers from web search | The connector is added but not connected, or it is switched off for this chat. Open the connector settings and click Connect, then check **+ → Connectors** in the chat box. |
| Results stop at 31 days | The server searches the last 31 days unless you name a period. Say "since January" or "in 2025" to widen it. |
| "Tokens used" grows fast | Event searches and searches older than 31 days cost more. Ask about recent coverage, or name the company or topic precisely so one search is enough. |

## What the assistant can do

| Tool | Description |
|------|-------------|
| `suggest` | Look up URIs for entities, sources, categories, locations and event types by name. Used before searching with URI filters. |
| `search` | One search tool with `kind`: `articles` (by concepts, sources, categories, dates, language, sentiment), `events` (clusters of related articles about the same happening) or `mentions` (sentences that state a specific event type such as an acquisition, layoffs, a launch or a recall, with entities and article links). Every kind also returns aggregates (`resultType`: coverage over time, top sources, top entities, sentiment). |
| `get_article_details` | Article information (URL, publisher, date, entities and more) for articles selected from a search. |
| `get_event_details` | Summary, concepts and articles of an event. |
| `get_breaking_events` | List the events breaking right now, ranked by breaking score. |
| `get_topic_page_articles` | Get articles from a saved [Topic Page](https://newsapi.ai) on NewsAPI.ai. |
| `get_topic_page_events` | Get events from a saved Topic Page on NewsAPI.ai. |
| `get_api_usage` | Check token usage and plan details for the current account. |

## Claude Code plugin

The repository is a Claude Code plugin: it bundles the hosted MCP server and six research
skills, so one install gives Claude Code both.

```bash
claude plugin marketplace add EventRegistry/newsapi-mcp
claude plugin install newsapi@newsapi-mcp
```

Ask a news question or run a skill; Claude Code prompts you to log in with your Event
Registry account the first time (or run `/mcp` to log in up front). Claude Code also picks
the right skill from a plain question, without the slash command.

| Skill | Ask it for | Example |
|-------|------------|---------|
| `/newsapi:news` | Overviews, article deep dives, happenings, coverage counts, breaking news, topic pages, research reports | "What is happening with the Boeing strike?" |
| `/newsapi:due-diligence` | Adverse media screening, ESG controversies, company profiles, key people | "Screen Wirecard for adverse media since 2024." |
| `/newsapi:risk` | Supply chain disruptions, country and regional geopolitical risk | "What is the supply chain risk for shipping through the Red Sea?" |
| `/newsapi:markets` | Economic indicators and sectors, company and asset analysis | "What drove Nvidia's stock this month?" |
| `/newsapi:political` | Policy, legislation, elections, diplomacy | "Where does the EU Digital Markets Act enforcement stand?" |
| `/newsapi:source-analysis` | Outlet comparison, sentiment, coverage landscape | "Compare how the BBC and Fox News covered the UN climate summit." |

The same skills ship as zips for Claude Desktop and claude.ai on every
[release](https://github.com/EventRegistry/newsapi-mcp/releases/latest) (one zip per skill,
uploaded under **Customize > Skills**).

[docs/skills.md](docs/skills.md) describes each skill, how they are built and how to use
them in Claude Desktop or without the plugin.

## Which setup do I need?

| You use | Server | Research skills |
|---------|--------|-----------------|
| Claude Desktop or claude.ai | Hosted connector (above), or the [local server](docs/local-server.md) | Upload the skill zips from the [latest release](https://github.com/EventRegistry/newsapi-mcp/releases/latest) |
| Claude Code | The [plugin](#claude-code-plugin) brings the hosted server; or add the hosted or [local](docs/local-server.md) server yourself | The plugin's six skills; they also work with a local server named `newsapi` |
| Codex, Cursor, other clients | Hosted connector (above), or the [local server](docs/local-server.md) | Not available |

Pick one server per client. If you install the plugin and also add a local `newsapi`
server, Claude Code shows both under `/mcp` and asks you to log in to each; disable the
one you do not use there.

### Updating

- Plugin: `claude plugin update newsapi@newsapi-mcp`.
- Local server: `npx` caches the package, so put `newsapi-mcp@latest` in the client
  configuration, or run `npx -y newsapi-mcp@latest` once.
- Desktop skills: download the zips of the new release and upload them again; the
  upload replaces the skill of the same name.

## Running it yourself

- **Local server**: run the server on your own machine with `npx newsapi-mcp`, log in in
  the browser or use an API key. For clients without remote-server support, and for
  developers. See [docs/local-server.md](docs/local-server.md).
- **Self-hosting**: deploy the hosted server from the Docker image in this repo. See
  [docs/deployment.md](docs/deployment.md).

## Links

- [npm package](https://www.npmjs.com/package/newsapi-mcp)
- [NewsAPI.ai documentation](https://newsapi.ai/documentation)
- [MCP protocol specification](https://modelcontextprotocol.io)
- [Changelog](CHANGELOG.md)
