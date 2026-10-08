# Aggregate result types and breaking events

Status: ready-for-agent
Kind: dev
Created: 2026-10-08

## Problem Statement

A model using the MCP server can only get lists back: up to 100 articles or 50 events per call. To answer "how did coverage of X develop over the year", "which outlets write most about X" or "is the tone on X positive", it has to page through lists and count by hand, which burns API tokens and context on article bodies it does not need. It also has no way to ask "what is breaking right now" without first guessing a topic to search for.

NewsAPI.ai already answers both questions directly. The getArticles and getEvents endpoints return aggregates (time series, top sources, top concepts, sentiment distribution) when `resultType` is set to an aggregate, and the getBreakingEvents endpoint returns the currently breaking events ranked by a breaking score. The server hardcodes the list result types and does not wire the breaking endpoint at all.

## Solution

`search_articles` and `search_events` gain a `resultType` parameter. The default keeps today's behaviour (a list). Any aggregate value returns a compact numbered summary (label and count per row) instead of a list, costing one search action and a few hundred tokens of context. A new `get_breaking_events` tool returns the current breaking events with their breaking score, formatted like other event lists. The guide resource and server instructions tell the model when an aggregate call replaces a scan.

## Requirements

1. `search_articles` accepts `resultType` with allowed values `articles` (default), `timeAggr`, `sourceAggr`, `authorAggr`, `keywordAggr`, `locAggr`, `conceptAggr`, `categoryAggr`, `sentimentAggr`, `langAggr`; the value is sent to the API unchanged.
2. `search_events` accepts `resultType` with allowed values `events` (default), `timeAggr`, `locAggr`, `sourceAggr`, `authorAggr`, `keywordAggr`, `conceptAggr`, `categoryAggr`, `sentimentAggr`; the value is sent to the API unchanged.
3. With the default `resultType`, both tools send exactly the request body they send today and return exactly the output they return today, so existing tests pass unchanged.
4. With an aggregate `resultType`, the request body carries the content filters and the `resultType` only: no paging, count, sort, body-length or `include*` parameters are sent, and `includeFields` and `articleBodyLen` are ignored.
5. With an aggregate `resultType`, the response is not passed through the article or event field filter; the aggregate object the API returns is passed to the formatter as is.
6. An aggregate formatter renders the aggregate as a numbered list, one line per row, in the form `N. <label> — <value>`, where the label is the row's human-readable name (date, keyword, language code, concept label, category label, source title, author name or location label, multilingual labels flattened to English) and the value is the row's count, weight or score.
7. `sentimentAggr` is rendered as a short distribution: the number of articles or events per sentiment bucket as the API groups them, plus the average when present.
8. The aggregate formatter falls back to compact JSON when the aggregate object does not have the expected `results` list, so an unexpected API shape is still visible to the model rather than reported as "No results".
9. The token footer the server appends to every tool result is present on aggregate results as well.
10. A `get_breaking_events` tool calls the getBreakingEvents endpoint and accepts `breakingEventsCount` (integer, 1 to 100, default 50), `breakingEventsPage` (integer from 1, default 1), `breakingEventsMinBreakingScore` (number, minimum 0, default 0.2) and `includeFields` with the same groups as `search_events`.
11. `get_breaking_events` output lists events in the same format as `search_events` (date, title, article count, URI, summary) with the breaking score appended to each entry, and the same pagination footer.
12. Field filtering for `get_breaking_events` keeps the event minimal set plus `breakingScore`, and honours `includeFields` groups exactly as `search_events` does.
13. The tool count and the tool table in the README, the server instructions and the guide resource name the new tool and explain when an aggregate `resultType` should replace a scan (volume over time, top sources, top entities, tone), and the guide resource test that checks tool names covers `get_breaking_events`.
14. Every tool's JSON Schema still converts to Zod through the registry at startup, verified by the existing schema test over all tools.

## Implementation Decisions

- The `resultType` parameter is added to the shared search tools rather than as separate aggregate tools, because every content filter applies unchanged and a second copy of the filter schema would double the tool surface the model has to read. The allowed values are the subset of the API's result types that are small and self-explanatory; `uriWgtList`, `conceptGraph`, `locTimeAggr`, `dateMentionAggr`, `sourceExAggr` and the `recentActivity*` stream types are left out because they are large, need follow-up calls or belong to the stream endpoints that are out of scope.
- A single `resultType` string per call. The API accepts an array, but one aggregate per call keeps the formatter and the token cost predictable.
- The search handlers branch once on whether `resultType` is the list type. The list branch is the existing code path. The aggregate branch builds the filter body, sets `resultType` and skips the paging, count, sort, body-length and include parameters, and returns the API response unfiltered.
- The tool formatter dispatches on the `resultType` param: the existing list formatter for the list type, a shared aggregate formatter otherwise. The aggregate formatter lives next to the other formatters and is generic over the aggregate kinds: it reads `<resultType>.results`, derives the label from the first present of the row's `date`, `keyword`, `lang`, `label`, `source.title`, `author.name` or `location.label` fields, and the value from the first present of `count`, `weight`, `score`. `sentimentAggr` has its own small branch because the API groups it into buckets rather than rows.
- `get_breaking_events` is defined in the events tool module next to `search_events` and `get_event_details`, since it reuses the event include parameters, the event field filter and the event formatter. Parameter names follow the API (`breakingEvents*` prefix), matching how the other tools expose `articlesCount`, `eventsCount` and so on.
- The response filter's result-type union gains a breaking-events value that selects the event filter with `breakingScore` added to the minimal field set, and reads the `breakingEvents` wrapper key. The event list formatter reads either the `events` or the `breakingEvents` wrapper and prints the score when a row has one, instead of a third copy of the list layout.
- The guide resource and the server instructions get a short "Aggregates" paragraph under the choose-your-tool section and a line on `get_breaking_events` under the simplify section, so the model reaches for one aggregate call instead of a 100-article scan when the question is quantitative.

## Testing Decisions

- A good test checks what the tool sends to the API and what text the model receives, not how the handler is structured. Tests assert on the request body passed to the API client and on the formatted string.
- Tool handlers are tested at the existing handler seam: the client module is mocked and the body passed to the API call is asserted, as in the current tools test file. New cases: an aggregate `resultType` on each search tool sends `resultType` and the filters but no paging, count, sort, body-length or include params; the default sends the same body as before; `get_breaking_events` sends the endpoint, defaults and include params.
- Formatters are tested at the existing formatter seam with hand-written API-shaped fixtures, as in the current formatters test file: one fixture per aggregate kind that has a distinct label field (time, source, concept, keyword, sentiment), the JSON fallback, and a breaking-events fixture showing the score and footer.
- The response filter test file gains a case for the breaking-events wrapper keeping `breakingScore` and the minimal set.
- One end-to-end case in the server test file, through the in-memory MCP transport with the global `fetch` stub, calls `search_articles` with `resultType: "timeAggr"` and checks the numbered output and the token footer.
- The existing schema test over all tools and the resources test over tool names cover the new tool automatically once it is registered.

## Out of Scope

- Mentions (`article/getMentions`, `suggestEventTypes`, `suggestIndustries`): a separate follow-up spec.
- The Text Analytics host (annotate, categorize, sentiment, semantic similarity, extract article info, detect language): judged low value.
- The minute streams (`minuteStreamArticles`, `minuteStreamEvents`): built for polling daemons; a stateless hosted server cannot keep the cursor.
- Per-aggregate size parameters (`conceptAggrConceptCount` and the like): API defaults are used.
- Topic-page tools keep the list result types only.

## Further Notes

- The exact row shape of each aggregate must be checked against the live API or the "Output schema" tab of the documentation during implementation; the generic label and value lookup is designed so a field-name mismatch degrades to the JSON fallback rather than to an empty result.
- The API charges one search action per aggregate call, the same as a list search, so the footer values need no special handling.
- Documentation source: https://newsapi.ai/documentation (tabs searchArticles, searchEvents, breakingEvents).
