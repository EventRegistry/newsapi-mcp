# NewsAPI.ai MCP Server

[![npm version](https://img.shields.io/npm/v/newsapi-mcp)](https://www.npmjs.com/package/newsapi-mcp)
[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A Model Context Protocol (MCP) server that provides real-time news intelligence
using [NewsAPI.ai](https://newsapi.ai/). This server enables LLMs to search articles,
track events, and analyze news through natural conversation.

Make sure to follow the [NewsAPI.ai Terms of Service](https://newsapi.ai/terms).

## Requirements
- Node.js 18 or newer
- Claude Desktop, Claude Code, VS Code, Cursor, Windsurf or any other MCP client

## Quick Start

There are two ways to connect:

- **Hosted server** (no install, no API key): add `https://mcp.newsapi.ai/mcp` to your
  AI tool and log in with your Event Registry account when it asks. Works in web apps
  such as claude.ai too. See [Hosted server](#hosted-server).
- **Local server** (runs on your machine via `npx`): add it to your MCP client (see
  [Configuration](#configuration) below). It logs you in to Event Registry in your browser
  on first use, or uses an API key when you set `NEWSAPI_KEY`.

## Hosted server

The hosted server runs the same tools at `https://mcp.newsapi.ai/mcp`. Your AI tool
opens a browser window to log in to Event Registry the first time you use it, and the
tools then run on your own account. If no Event Registry account is linked to your
login yet, sign in once at [eventregistry.org/login](https://eventregistry.org/login) and retry.

<details>
<summary><strong>Claude Code</strong></summary>

```bash
claude mcp add --transport http newsapi https://mcp.newsapi.ai/mcp
```

Ask a news question; Claude Code prompts you to log in (or run `/mcp` to log in up front).

</details>


<details>
<summary><strong>claude.ai and Claude Desktop</strong></summary>

**Customize → Connectors → + Add → Add custom connector**, enter the name `NewsAPI.ai` and
the URL `https://mcp.newsapi.ai/mcp`, then sign in when prompted.

</details>


<details>
<summary><strong>Codex</strong></summary>

```bash
codex mcp add newsapi --url https://mcp.newsapi.ai/mcp
codex mcp login newsapi
```

Or in `~/.codex/config.toml`:

```toml
[mcp_servers.newsapi]
url = "https://mcp.newsapi.ai/mcp"
```

</details>


<details>
<summary><strong>Cursor</strong></summary>

In `~/.cursor/mcp.json` (or `.cursor/mcp.json` in a project):

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
<summary><strong>Self-hosting</strong></summary>

The hosted server (`src/http.ts`) ships as a Docker image built from this repo. It
keeps no sessions and verifies each request's OAuth access token (a JWT signed by
the issuer, with `aud` set to the public URL) before calling NewsAPI.ai with it.

| Variable | Default | Meaning |
|----------|---------|---------|
| `MCP_PUBLIC_URL` | `https://mcp.newsapi.ai/mcp` | URL clients connect to; tokens must name it as `aud` |
| `MCP_AUTH_ISSUER` | `https://auth.id.eventregistry.org` | OAuth issuer; its `/.well-known/openid-configuration` gives the JWKS |
| `PORT` | `3000` | Port to listen on |

```bash
docker build -t newsapi-mcp-hosted .
docker run -p 3000:3000 -e MCP_PUBLIC_URL=https://mcp.example.org/mcp newsapi-mcp-hosted
```

Put it behind TLS at the public URL. `GET /healthz` answers `{"status":"ok"}`.
Without Docker: `npm run build:http && node dist/http.js`.

</details>

## Configuration

Install the NewsAPI.ai MCP server with your client (local server).

The server runs via `npx -y newsapi-mcp`. It authenticates in one of two ways:

- **Event Registry login** (default): the first request opens your browser to log in;
  tokens are kept in your OS credential store (Keychain, Credential Manager, Secret
  Service) and refreshed automatically. Log in up front with `npx newsapi-mcp login`,
  forget the login with `npx newsapi-mcp logout`. The login listens on
  `http://127.0.0.1:51337/callback` (51338 and 51339 as fallbacks). If no Event
  Registry account is linked to your login yet, sign in once at
  [eventregistry.org/login](https://eventregistry.org/login) and retry.
- **API key**: set `NEWSAPI_KEY` (get one at [newsapi.ai/register](https://newsapi.ai/register);
  free tier: one time 2,000 tokens) and no login happens.

**Standard config** works in most of the tools (drop the `env` block to use the login):

```json
{
  "mcpServers": {
    "newsapi": {
      "command": "npx",
      "args": ["-y", "newsapi-mcp"],
      "env": {
        "NEWSAPI_KEY": "your_api_key_here"
      }
    }
  }
}
```

Below are examples for popular MCP clients.

<details>
<summary><strong>Antigravity</strong></summary>

Add via the Antigravity settings or by updating your configuration file:

```json
{
  "mcpServers": {
    "newsapi": {
      "command": "npx",
      "args": ["-y", "newsapi-mcp"],
      "env": {
        "NEWSAPI_KEY": "your_api_key_here"
      }
    }
  }
}
```

</details>


<details>
<summary><strong>Claude Code</strong></summary>

```bash
claude mcp add newsapi -e NEWSAPI_KEY=your_api_key_here -- npx -y newsapi-mcp
```

</details>


<details>
<summary><strong>Claude Desktop</strong></summary>

Follow the MCP install [guide](https://modelcontextprotocol.io/docs/develop/connect-local-servers), use the standard config above.

</details>


<details>
<summary><strong>Gemini CLI</strong></summary>

Follow the MCP install [guide](https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/mcp-server.md#configure-the-mcp-server-in-settingsjson), use the standard config above.

</details>


<details>
<summary><strong>Qodo Gen</strong></summary>

Open [Qodo Gen](https://docs.qodo.ai/qodo-documentation/qodo-gen) chat panel in VSCode or IntelliJ → Connect more tools → + Add new MCP → Paste the standard config above.

</details>


<details>
<summary><strong>VS Code</strong></summary>

Follow the MCP install [guide](https://code.visualstudio.com/docs/copilot/customization/mcp-servers#_add-an-mcp-server), use the standard config above. You can also install the NewsAPI.ai MCP server using the VS Code CLI:

```bash
# For VS Code
code --add-mcp '{"name":"newsapi","command":"npx","args":["-y","newsapi-mcp"],"env":{"NEWSAPI_KEY":"your_api_key_here"}}'
```

After installation, the NewsAPI.ai MCP server will be available for use with your GitHub Copilot agent in VS Code.

</details>


<details>
<summary><strong>Windsurf</strong></summary>

Follow Windsurf MCP [documentation](https://docs.windsurf.com/windsurf/cascade/mcp). Use the standard config above.

</details>

## Usage Patterns

### Search News Articles

Find articles by keyword, source, author, date, language, sentiment, and more.

- Find recent articles about the EU AI Act
- What has Reuters published about climate change this week?
- Show me negative-sentiment articles about Tesla from the last 3 days
- Find French-language coverage of the Paris Olympics
- What are German media reporting about the EU budget?

### Track Events

Events are clusters of related articles about the same real-world happening.

- Find events related to mergers and acquisitions in the tech sector
- What larger events happened in Slovenia last week?
- What are the biggest news stories globally this week?

### Use Topic Pages

Pull articles or events from saved [Topic Pages](https://newsapi.ai) on NewsAPI.ai.

- Summarize the latest articles from my cyber-security topic page with URI b220679c-95ff-4e4e-a1fa-ad8b3905b7df


## Available Tools

| Tool | Description |
|------|-------------|
| `suggest` | Look up URIs for entities and event types by name. Required before searching with URI filters. |
| `search` | One search tool with `kind`: `articles` (by concepts, sources, categories, dates, language, sentiment), `events` (clusters of related articles about the same happening) or `mentions` (sentences that state a specific event type such as an acquisition, layoffs, a launch or a recall, with entities and article links). Every kind also returns aggregates (`resultType`: coverage over time, top sources, top entities, sentiment). |
| `get_breaking_events` | List the events breaking right now, ranked by breaking score. |
| `get_topic_page_articles` | Get articles from a pre-configured topic page on NewsAPI.ai. |
| `get_topic_page_events` | Get events from a pre-configured topic page on NewsAPI.ai. |
| `get_api_usage` | Check token usage and plan details for the current API key. |

## News Research Skill

The `skill/` directory contains a `/news` slash command for [Claude Code](https://code.claude.com/docs/en/skills)
(CLI and Desktop) that orchestrates multi-step research workflows on top of the MCP tools.
It automates the suggest → scan → triage → retrieve pattern and formats findings into structured reports.

```
/news "What's happening with AI regulation?"
```

To install, copy the `skill/` directory into your project's `.claude/skills/` directory. See the
[skills documentation](https://code.claude.com/docs/en/skills) for details.

## Links

- [npm package](https://www.npmjs.com/package/newsapi-mcp)
- [NewsAPI.ai Documentation](https://newsapi.ai/documentation)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
