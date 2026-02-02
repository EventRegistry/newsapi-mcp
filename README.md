# NewsAPI.ai MCP Server

An MCP (Model Context Protocol) server that connects Claude to the [NewsAPI.ai](https://newsapi.ai) news intelligence platform. Search articles, track events, analyze text, and monitor real-time news — all through natural conversation.

## Setup

### 1. Get an API Key

1. Register at [newsapi.ai/register](https://newsapi.ai/register) (free tier: 2,000 tokens)
2. Copy your key from [Settings](https://newsapi.ai/settings?tab=settings)

### 2. Add to Claude

#### npx (recommended — no install needed)

**Claude Code (CLI):**

```bash
claude mcp add newsapi -e NEWSAPI_KEY=your_api_key_here -- npx -y newsapi-mcp
```

**Claude Desktop** (`claude_desktop_config.json`):

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

**Claude Code** (`.claude/settings.json` or `~/.claude/settings.json`):

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

#### From source (development)

```bash
git clone <repo-url>
cd newsapi-mcp
npm install
npm run build
```

Then point your config to the local build:

```json
{
  "mcpServers": {
    "newsapi": {
      "command": "node",
      "args": ["/absolute/path/to/newsapi-mcp/dist/index.js"],
      "env": {
        "NEWSAPI_KEY": "your_api_key_here"
      }
    }
  }
}
```

> **Note:** `npm run build` compiles TypeScript but the output still depends on `node_modules/`. The `dist/` folder alone is not portable.

#### Standalone build (portable single file)

To produce a self-contained bundle with all dependencies inlined:

```bash
npm run build:bundle
```

This creates a single `dist/index.js` that can be copied to any machine with Node.js 18+ — no `node_modules` needed:

```bash
# Copy just the bundled file to another machine
scp dist/index.js server:/opt/newsapi-mcp/index.js

# Run it directly
NEWSAPI_KEY=your_key node /opt/newsapi-mcp/index.js
```

---

## What You Can Do

### Search News Articles

Find articles by keyword, source, author, date, language, sentiment, and more.

**Example prompts:**

> "Find recent articles about the EU AI Act"

> "What has Reuters published about climate change this week?"

> "Show me negative-sentiment articles about Tesla from the last 3 days"

> "Find articles by specific author John Smith from the New York Times"

The `search_articles` tool supports up to 100 results per call with sorting by date, relevance, source importance, or social score.

### Track Events

Events are clusters of related articles about the same real-world happening. One product launch might generate hundreds of articles — events group them together.

**Example prompts:**

> "What are the breaking events right now?"

> "Find events related to mergers and acquisitions in the tech sector"

> "Get details on event number 12345"

> "What events happened related to earthquakes in the last week?"

### Monitor Real-Time News

Stream articles or events as they're published, updated every few minutes.

**Example prompts:**

> "Stream the latest articles about artificial intelligence"

> "Show me newly created events from the last 30 minutes"

### Search Mentions

Mentions are sentence-level extractions of specific event types — mergers, layoffs, product launches, natural disasters, and more.

**Example prompts:**

> "Find recent mentions of layoffs in the tech industry"

> "Show me mentions of product launches in the automotive sector"

> "What merger announcements have been made this week?"

### Analyze Text

Run NLP tasks on any text without searching news.

**Example prompts:**

> "What entities are mentioned in this paragraph: [paste text]"

> "Categorize this article text: [paste text]"

> "What's the sentiment of this headline: 'Markets crash amid trade war fears'"

> "Extract the article content from this URL: https://example.com/article"

> "How similar are these two texts semantically?"

> "What language is this text written in?"

### Use Topic Pages

If you've created a [Topic Page](https://newsapi.ai) on NewsAPI.ai (a saved search profile), you can pull articles or events from it directly.

**Example prompts:**

> "Get the latest articles from my topic page with URI abc123"

> "Show events matching topic page xyz789"

---

## How URI Lookups Work

Many tools require URIs (unique identifiers) for concepts, sources, categories, and locations. The server provides `suggest_*` tools that resolve names to URIs.

You don't need to worry about this — Claude handles it automatically. When you say "articles about Apple from the BBC," Claude will:

1. Call `suggest_concepts` with "Apple" to get `http://en.wikipedia.org/wiki/Apple_Inc.`
2. Call `suggest_sources` with "BBC" to get `bbc.co.uk`
3. Pass both URIs to `search_articles`

Available lookup tools: `suggest_concepts`, `suggest_categories`, `suggest_sources`, `suggest_locations`, `suggest_authors`, `suggest_event_types`.

---

## Advanced Filtering

### Combining Filters

All content filters can be combined:

- **Keywords** — search in title, body, or both
- **Concepts** — people, organizations, locations, things (via URI)
- **Categories** — news topic categories (via URI)
- **Sources** — specific publishers (via URI)
- **Authors** — specific journalists (via URI)
- **Locations** — where the article was written or events occurred (via URI)
- **Dates** — start/end date range (YYYY-MM-DD)
- **Language** — ISO codes: `eng`, `deu`, `fra`, `spa`, etc.
- **Sentiment** — range from -1 (negative) to 1 (positive)
- **Source rank** — filter by source importance percentile (0-100, lower = more important)
- **Duplicate filtering** — skip or keep near-duplicate articles

### Advanced Query Language

For complex Boolean logic, use the `query` parameter directly:

```json
{
  "$query": {
    "$and": [
      { "keyword": "artificial intelligence" },
      {
        "$or": [
          { "conceptUri": "http://en.wikipedia.org/wiki/Google" },
          { "conceptUri": "http://en.wikipedia.org/wiki/Microsoft" }
        ]
      }
    ]
  },
  "$filter": {
    "dateStart": "2024-01-01",
    "lang": "eng"
  }
}
```

Operators: `$and`, `$or`, `$not`.

---

## Rate Limits & Token Costs

| Action | Token Cost |
|--------|-----------|
| Article search (up to 100 results) | 1 token |
| Event search (up to 50 results) | 1 token |
| Article stream | Scales with results (~3 tokens per 250 articles) |
| Suggestions / lookups | Low cost |
| Text analytics | Varies |

**Concurrency:** Max 5 simultaneous requests. Exceeding returns a 503 error. Claude sends requests sequentially by default, so this is rarely an issue.

**Check your usage** anytime:

> "How many API tokens have I used?"

---

## All 27 Tools

| Category | Tool | What It Does |
|----------|------|-------------|
| **Articles** | `search_articles` | Search articles with filters |
| | `get_article_details` | Get full article by URI |
| | `stream_articles` | Real-time article stream |
| **Events** | `search_events` | Search event clusters |
| | `get_event_details` | Get full event by URI |
| | `get_breaking_events` | Currently trending events |
| | `stream_events` | Real-time event stream |
| | `find_event_for_text` | Match text to a known event |
| **Mentions** | `search_mentions` | Sentence-level event type mentions |
| **Topic Pages** | `get_topic_page_articles` | Articles from a saved topic page |
| | `get_topic_page_events` | Events from a saved topic page |
| **Analytics** | `annotate_text` | Named entity recognition |
| | `categorize_text` | Text classification |
| | `analyze_sentiment` | Sentiment scoring (-1 to 1) |
| | `extract_article_info` | Extract article from URL |
| | `detect_language` | Language detection |
| | `compute_semantic_similarity` | Compare two texts |
| **Lookups** | `suggest_concepts` | Find concept URIs |
| | `suggest_categories` | Find category URIs |
| | `suggest_sources` | Find source URIs |
| | `suggest_locations` | Find location URIs |
| | `suggest_authors` | Find author URIs |
| | `suggest_event_types` | Find event type URIs |
| **Usage** | `get_api_usage` | Check token usage and plan |

---

## Development

```bash
npm run dev          # Run with tsx (hot reload)
npm run build        # Compile TypeScript
npm start            # Run compiled server
npm test             # Run tests
npm run test:watch   # Tests in watch mode
```

### Testing with MCP Inspector

The [MCP Inspector](https://github.com/modelcontextprotocol/inspector) provides a web UI for testing tools interactively.

**1. Build and launch the inspector:**

```bash
npm run build
npx @modelcontextprotocol/inspector node --env-file=.env dist/index.js
```

This starts two servers:
- **Inspector UI** on `http://localhost:6274`
- **Proxy server** on `http://localhost:6277`

A session token is printed to the console — copy it.

**2. Connect in the browser:**

Open `http://localhost:6274`, then in the sidebar:

1. Set **Transport Type** to `STDIO`
2. Set **Command** to `node`
3. Set **Arguments** to `--env-file=.env dist/index.js`
4. Expand **Configuration** and paste the session token into **Proxy Session Token**
5. Click **Connect**

Once connected, click **List Tools** to see all available tools and test them.

**Remote access (port forwarding):**

If the inspector runs on a remote machine, forward both ports:

```bash
ssh -L 6274:localhost:6274 -L 6277:localhost:6277 your-server
```

## Further Reading

- [NewsAPI.ai Documentation](https://newsapi.ai/documentation)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
