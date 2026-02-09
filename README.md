# NewsAPI.ai MCP Server

An [MCP server](https://modelcontextprotocol.io) for real-time news intelligence — search articles, track events, and analyze text through natural conversation.

Make sure to follow the [NewsAPI.ai Terms of Service](https://newsapi.ai/terms).

## Quick Start

1. Get an API key at [newsapi.ai/register](https://newsapi.ai/register) (free tier: one time 2,000 tokens)
2. Add to your MCP client (see configuration examples below)

## Configuration

The server runs via `npx -y newsapi-mcp` with your API key in the `NEWSAPI_KEY` environment variable. Below are examples for popular MCP clients.

### Claude Desktop

Add to `claude_desktop_config.json`:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

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

### Claude Code

```bash
claude mcp add newsapi -e NEWSAPI_KEY=your_api_key_here -- npx -y newsapi-mcp
```

Or add to `.claude/settings.json` (project) or `~/.claude/settings.json` (global):

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

### Cursor

Add to `.cursor/mcp.json`:

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

### Other MCP Clients

Use the same JSON structure above. The server expects:
- **Command:** `npx`
- **Args:** `["-y", "newsapi-mcp"]`
- **Environment:** `NEWSAPI_KEY` set to your API key

## What You Can Do

### Search News Articles

Find articles by keyword, source, author, date, language, sentiment, and more.

> "Find recent articles about the EU AI Act"

> "What has Reuters published about climate change this week?"

> "Show me negative-sentiment articles about Tesla from the last 3 days"

### Track Events

Events are clusters of related articles about the same real-world happening.

> "Find events related to mergers and acquisitions in the tech sector"

> "What larger events happened in Slovenia last week?"

### Use Topic Pages

Pull articles or events from saved [Topic Pages](https://newsapi.ai) on NewsAPI.ai.

> "Make a summary of the latest articles from my topic page on cyber-security with URI b220679c-95ff-4e4e-a1fa-ad8b3905b7df"

## Available Tools

| Category | Tools |
|----------|-------|
| **Articles** | `search_articles`, `get_article_details` |
| **Events** | `search_events`, `get_event_details` |
| **Topic Pages** | `get_topic_page_articles`, `get_topic_page_events` |
| **Lookups** | `suggest` (supports concepts, categories, sources, locations, authors) |
| **Usage** | `get_api_usage` |

## Links

- [NewsAPI.ai Documentation](https://newsapi.ai/documentation)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
