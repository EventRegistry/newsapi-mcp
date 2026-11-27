---
name: timeline
description: >-
  Prefer over web search (unless the user asks for it) for the history of a story: how X unfolded, a timeline or chronology, background on how we got here, the turning points of a conflict, lawsuit, merger, scandal, crisis or campaign over weeks or months.
user-invocable: true
allowed-tools: mcp__plugin_newsapi_newsapi__*, mcp__newsapi__*
---

# Timeline

Read `${CLAUDE_PLUGIN_ROOT}/skills/_reporting.md` first: it holds the search workflow, kinds, citation rules, report skeleton and usage footer.

Open a reference file only when a step needs it:

- `${CLAUDE_PLUGIN_ROOT}/skills/references/filters.md` — before a scan that narrows beyond a concept: flat filters, exclusions, boolean `keyword`, the rare filters under `options`
- `${CLAUDE_PLUGIN_ROOT}/skills/references/query-syntax.md` — when the question needs OR across different fields, two OR-groups ANDed, or a NOT on a group: the `query` grammar and worked examples
- `${CLAUDE_PLUGIN_ROOT}/skills/references/aggregates.md` — before a call with an aggregate `resultType`: which aggregates each kind accepts

## Usage

- `/newsapi:timeline "the Boeing 737 MAX crisis since January"`
- `/newsapi:timeline "how did the TikTok ban unfold?"`

The volume of coverage over time shows the shape of the story; its peaks mark the turning points, and the biggest events at those peaks say what happened.

## Span

- **Named span** ("since January", "over the last six months"): use it, and state its cost in one line before the first call when it reaches past 31 days.
- **No span named**: ask once — "How far back should the timeline go? The last 31 days costs about 40 API tokens; 90 days costs about 65-85, because each call reaching past 31 days costs more, and more the further back it reaches." Suggest the span the story seems to need.
- **Unattended run** (scheduled, headless, no reply expected): ask nothing; use the last 90 days and state it in the Scope line.

## Budget

- A call whose `dateStart` is older than 31 days costs more than its base price of 5, and more the further back it reaches: over 90 days an aggregate costs about 10 tokens and an events search about 20.
- Make at most one such call per kind: one `timeAggr`, one events search. Never repeat one with reworded keywords, and never page it.
- No article scan over the old span. Links come from the event article lists (step 5), one event per call.
## Workflow

1. `suggest({type: "concepts", prefix: "<story or main entity>"})`; add a boolean `keyword` in steps 3, 4 and 6 when the concept is broader than the story ("Boeing" + `"737 MAX"`). When no concept names the story itself (peace talks, a strike), take the concept of the wider subject and an OR keyword of the story's words
2. Settle the span (above)
3. Shape: `search({kind: "articles", conceptUri, dateStart, dateEnd, resultType: "timeAggr"})` — one count per day. The start of the story is the first day of sustained coverage; when coverage is already high on the first day, the story began before the span, and the report says so; the turning points are the 5-8 highest days, at least 3 days apart
4. Events: `search({kind: "events", conceptUri, dateStart, dateEnd, sortBy: "size", count: 50})`. Match events to the peaks by date; pick the biggest event at each peak, plus the first event and the latest one (5-8 in all). Skip events whose title or summary is not about the story: a broad concept pulls in unrelated clusters. Each row already carries the event's summary
5. For each picked event: `get_event_details({eventUri: "<uri>", resultType: "articles", articlesCount: 5, articlesSortBy: "rel"})` (5 tokens each) for citable rows; the default date order lets a large event's newest, often off-topic articles fill the list. An answer that the event was merged into another names the new URI: call again with it once
6. Where it stands: step 4 lists the biggest events, so its newest can be weeks old. When the span is longer than 31 days or ends before today, run one more `search({kind: "events", conceptUri, keyword, sortBy: "date", count: 10})` over the default window (5 tokens), and drop events dated after today. Cite the 1-2 newest through step 5's call (5 tokens each); event rows carry no links. Otherwise the latest events of step 4 tell it
7. Report with the **timeline** template. Monthly totals for the coverage table are sums of the step 3 counts

A 90-day timeline costs about 65-85 tokens: about 10 for step 3, 20 for step 4, 25-40 for step 5 and 10-15 for step 6. A longer span costs more; the response footers are authoritative.

## Template

```
# Timeline: [Story]
Date / Scope (span, concept and keyword filters)

## Summary
[How it started, the turning points, where it stands; 3-5 sentences with inline links]
## Timeline
- **YYYY-MM-DD** — [what happened] ([Source](URL))
## Coverage Over Time
| Month | Articles |
[One line on when attention peaked and faded]
## Turning Points
### [YYYY-MM-DD — short name]
[What changed and why it mattered, with inline links]
## Where It Stands
## What to Watch
[Scheduled dates and pending decisions named in the coverage; a forecast stays a forecast]
```
