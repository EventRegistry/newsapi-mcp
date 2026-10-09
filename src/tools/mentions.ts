import { contentFilterProps } from "./articles.js";
import type { SearchKind } from "./search.js";
import { getMentionIncludeParams } from "../response-filter.js";
import { formatMentionResults } from "../formatters.js";

/** The shared content filters the mentions endpoint supports. */
const SHARED_FILTER_KEYS = [
  "keyword",
  "conceptUri",
  "categoryUri",
  "sourceUri",
  "sourceLocationUri",
  "sourceGroupUri",
  "locationUri",
  "lang",
  "dateStart",
  "dateEnd",
  "keywordOper",
  "keywordSearchMode",
  "conceptOper",
  "categoryOper",
  "minSentiment",
  "maxSentiment",
  "startSourceRankPercentile",
  "endSourceRankPercentile",
  "ignoreKeyword",
  "ignoreConceptUri",
  "ignoreCategoryUri",
  "ignoreSourceUri",
  "ignoreSourceLocationUri",
  "ignoreSourceGroupUri",
  "ignoreLocationUri",
  "ignoreLang",
] as const;

const supported = new Set<string>(SHARED_FILTER_KEYS);

const mentionFilterProps: Record<string, unknown> = {
  eventTypeUri: {
    type: "string",
    description:
      "Event type URI(s) from suggest(type: \"eventTypes\"), comma-separated (OR).",
  },
  factLevel: {
    type: "string",
    description:
      'How factual the sentence is (comma-separated): "fact", "opinion", "forecast".',
  },
};

/** Mention-only filters most searches never need. */
const mentionRareProps: Record<string, unknown> = {
  industryUri: {
    type: "string",
    description:
      'Industry URI(s) of a company mentioned in the sentence (comma-separated), e.g. "sectors/Communications".',
  },
  sdgUri: {
    type: "string",
    description:
      'UN Sustainable Development Goal URI(s) the event type belongs to (comma-separated), e.g. "sdg/sdg5_gender_equality".',
  },
  sasbUri: {
    type: "string",
    description:
      'SASB materiality URI(s) the event type belongs to (comma-separated), e.g. "sasb/environment/air_quality".',
  },
  esgUri: {
    type: "string",
    description:
      'ESG pillar(s) the event type belongs to (comma-separated): "esg/environment", "esg/social", "esg/governance".',
  },
  minSentenceIndex: {
    type: "integer",
    description:
      "Minimum position of the sentence in the article (title is 0, first body sentence is 1).",
    minimum: 0,
  },
  maxSentenceIndex: {
    type: "integer",
    description:
      "Maximum position of the sentence in the article. Set to 1 for title and lead sentence only.",
    minimum: 0,
  },
  showDuplicates: {
    type: "boolean",
    description:
      "Include near-identical sentences from syndicated copies. Default: false.",
  },
  ignoreEventTypeUri: {
    type: "string",
    description: "Exclude by event type URI(s). Comma-separated for multiple.",
  },
  ignoreIndustryUri: {
    type: "string",
    description: "Exclude by industry URI(s). Comma-separated for multiple.",
  },
  ignoreSdgUri: {
    type: "string",
    description: "Exclude by SDG URI(s). Comma-separated for multiple.",
  },
  ignoreSasbUri: {
    type: "string",
    description: "Exclude by SASB URI(s). Comma-separated for multiple.",
  },
  ignoreEsgUri: {
    type: "string",
    description: "Exclude by ESG pillar(s). Comma-separated for multiple.",
  },
};

/** search({kind: "mentions"}): sentences that state a kind of happening. */
export const mentionsKind: SearchKind = {
  path: "/eventType/mention",
  aggregates: [
    "timeAggr",
    "sourceAggr",
    "keywordAggr",
    "locAggr",
    "conceptAggr",
    "eventTypeAggr",
    "categoryAggr",
    "sentimentAggr",
    "langAggr",
  ],
  defaultCount: 50,
  maxCount: 100,
  sortBy: [
    "date",
    "rel",
    "sourceImportance",
    "sourceAlexaGlobalRank",
    "sourceAlexaCountryRank",
  ],
  props: mentionFilterProps,
  optionProps: mentionRareProps,
  unsupported: Object.keys(contentFilterProps).filter((k) => !supported.has(k)),
  // The mentions endpoint has no forceMaxDataTimeWindow; bound the window by date.
  searchOptions: { dateDefault: "dateStart" },
  // The mentions endpoint routes on an action field.
  adapt: (body) => {
    body.action = "getMentions";
  },
  includeParams: getMentionIncludeParams,
  formatter: formatMentionResults,
};
