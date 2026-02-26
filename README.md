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

1. Get an API key at [newsapi.ai/register](https://newsapi.ai/register) (free tier: one time 2,000 tokens)
2. Add to your MCP client (see configuration examples below)

## Configuration

Install the NewsAPI.ai MCP server with your client.

The server runs via `npx -y newsapi-mcp` with your API key in the `NEWSAPI_KEY` environment variable.

**Standard config** works in most of the tools:

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
| `suggest` | Look up URIs for entities by name. Required before searching with URI filters. |
| `search_articles` | Search articles by concepts, sources, categories, dates, language, sentiment. |
| `search_events` | Search events (clusters of related articles about the same happening). |
| `get_topic_page_articles` | Get articles from a pre-configured topic page on NewsAPI.ai. |
| `get_topic_page_events` | Get events from a pre-configured topic page on NewsAPI.ai. |
| `get_api_usage` | Check token usage and plan details for the current API key. |

## Links

- [npm package](https://www.npmjs.com/package/newsapi-mcp)
- [NewsAPI.ai Documentation](https://newsapi.ai/documentation)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
