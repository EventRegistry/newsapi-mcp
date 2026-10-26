# How to ask

What the NewsAPI.ai server can answer, and how to phrase a question so the assistant
finds it in one or two searches.

## What is in the database

- News articles from 150,000+ sources in 50+ languages, with article information such as
  publisher, publish time, named entities and sentiment.
- Events: clusters of articles about one real-world happening, with a summary and an
  article count. One event per story, however many outlets covered it.
- Mentions: sentences that state a specific kind of happening (an acquisition, layoffs, a
  product launch, a recall, a lawsuit, a disaster), with the entities involved.
- Topic pages you saved on [newsapi.ai](https://newsapi.ai/).

It is not a web search: there are no company websites, social media posts or documents,
only published news.

## Three kinds of question

| You want                                               | Ask like                                                                          | The assistant uses |
| ------------------------------------------------------ | --------------------------------------------------------------------------------- | ------------------ |
| An overview of what is going on                        | "What is happening with X?", "What are the biggest stories this week?"            | events             |
| Specific articles, article information, a given outlet | "What did Reuters write about X?", "Find French articles on X"                    | articles           |
| Who did what                                           | "Which companies announced layoffs this month?", "Recent acquisitions in biotech" | mentions           |

Numbers are a fourth kind: "How much coverage did X get per day in September?", "Which
outlets write most about X?", "Is coverage of X positive or negative?" are answered with
one aggregate call instead of a list.

## Phrasing that helps

- **Name the thing.** "Tesla", "European Central Bank", "Olympic Games" are resolved to
  precise entities; a vague phrase falls back to a text search. Use the English name,
  also for places.
- **Name the period.** Without one, the server searches the last 31 days and says so.
  "This week", "last month", "since January", "in 2024" all work. Searches that reach back
  more than 30 days cost more API tokens, so name a period only when you need it.
- **Name the outlet or country** when it matters: "in German media", "from the BBC and
  the Guardian", "US sources only".
- **Say how much you want.** "A quick answer" gives a few articles; "a full report"
  reads dozens. The due-diligence and risk skills ask for the depth first.
- **Combine with and / or / not.** "Tesla and (recall or lawsuit) not Musk" is sent as
  one boolean query.

## What the answer looks like

The assistant reviews the article information and writes the answer in its own words,
with a link to each article it draws on. It does not paste raw search results. Follow the
links to read the originals.

## Cost

Each tool result shows the API tokens it cost and how many remain in your account.
Looking up a name is free; a search within the last 30 days costs a few tokens; archive
searches are priced per searched year. The official rates per request are in the Tokens
section of [newsapi.ai/plans](https://newsapi.ai/plans#faq).

Ask "how many API tokens do I have left?" to see the account total.
