import { apiPost } from "../client.js";
import type { ToolDef } from "../types.js";
import {
  contentFilterProps,
  buildAggregateBody,
  buildFilterBody,
  formatByResultType,
  resultTypeProp,
} from "./articles.js";
import {
  parseFieldGroups,
  getMentionIncludeParams,
  filterResponse,
} from "../response-filter.js";
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

const sharedFilterProps = Object.fromEntries(
  SHARED_FILTER_KEYS.map((k) => [k, contentFilterProps[k]]),
);

const mentionFilterProps: Record<string, unknown> = {
  eventTypeUri: {
    type: "string",
    description:
      'Event type URI(s) the sentence expresses (comma-separated), e.g. an acquisition, layoffs, a product launch. Use suggest(type: "eventTypes") to look up URIs. Multiple values are OR-ed.',
  },
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
  factLevel: {
    type: "string",
    description:
      'How factual the sentence is (comma-separated): "fact", "opinion", "forecast".',
  },
  keywordSearchMode: {
    type: "string",
    description:
      'How keyword is matched: "phrase" (exact phrase, default), "exact" (boolean query with AND, OR, NOT, NEAR, NEXT), "simple" (relevance-based, not all terms required).',
    enum: ["phrase", "exact", "simple"],
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

const MENTION_AGGREGATES = [
  "timeAggr",
  "sourceAggr",
  "keywordAggr",
  "locAggr",
  "conceptAggr",
  "eventTypeAggr",
  "categoryAggr",
  "sentimentAggr",
  "langAggr",
] as const;

/** The mentions endpoint routes on an action field, unlike the article and event endpoints. */
const MENTIONS_PATH = "/eventType/mention";
const MENTIONS_ACTION = "getMentions";

const MENTION_LIST_PARAMS = [
  "mentionsPage",
  "mentionsCount",
  "mentionsSortBy",
  "mentionsSortByAsc",
] as const;

export const searchMentions: ToolDef = {
  name: "search_mentions",
  description: `Search individual sentences that state a specific kind of happening (an event type): acquisitions, layoffs, product launches, recalls, lawsuits, natural disasters and ~100 more. Each result is one sentence with its event type, the entities involved, sentiment and a link to the article. Returns up to 100 mentions per call.

WORKFLOW: suggest({type: "eventTypes", prefix: "layoff"}) → eventTypeUri, then combine with conceptUri, sourceUri, dates and so on.
EXAMPLE: search_mentions({eventTypeUri: "<uri>", conceptUri: "<uri>", dateStart: "2025-01-01"})

USE THIS WHEN the question names a kind of happening or a relation between entities ("which companies announced layoffs", "deals involving X") — one call replaces scanning and reading article bodies.
NOT THIS for general coverage of a topic — use search_articles or search_events.`,
  inputSchema: {
    type: "object",
    properties: {
      ...sharedFilterProps,
      ...mentionFilterProps,
      includeFields: {
        type: "string",
        description:
          "Comma-separated field groups to include beyond the minimal set (sentence, event type, date, source, article title and links, sentiment). Options: slots (entities in the sentence), categories (of the article), frameworks (SDG, ESG, SASB tags of the event type), metadata, full. Default: minimal only.",
      },
      ...resultTypeProp("mentions", MENTION_AGGREGATES),
      mentionsPage: {
        type: "integer",
        description: "Page number (starting from 1). Default: 1.",
        minimum: 1,
      },
      mentionsCount: {
        type: "integer",
        description: "Mentions per page (max 100). Default: 100.",
        minimum: 1,
        maximum: 100,
      },
      mentionsSortBy: {
        type: "string",
        description:
          'Sort by: "date" (default), "rel", "sourceImportance", "sourceAlexaGlobalRank", "sourceAlexaCountryRank".',
        enum: [
          "date",
          "rel",
          "sourceImportance",
          "sourceAlexaGlobalRank",
          "sourceAlexaCountryRank",
        ],
      },
      mentionsSortByAsc: {
        type: "boolean",
        description: "Ascending sort order. Default: false.",
      },
      query: {
        type: ["object", "string"],
        description:
          "Advanced Query Language object for complex boolean logic. See API docs. Overrides simple filter params when provided.",
      },
    },
  },
  handler: async (params) => {
    const resultType = (params.resultType as string) || "mentions";
    if (resultType !== "mentions") {
      const body = buildAggregateBody(params, resultType, MENTION_LIST_PARAMS);
      body.action = MENTIONS_ACTION;
      return apiPost(MENTIONS_PATH, body);
    }

    params.mentionsCount ??= 100;
    const groups = parseFieldGroups(params.includeFields as string | undefined);
    const body = buildFilterBody(params);
    body.action = MENTIONS_ACTION;
    body.resultType = "mentions";
    Object.assign(body, getMentionIncludeParams(groups));

    const { data, tokenUsage } = await apiPost(MENTIONS_PATH, body);
    return {
      data: filterResponse(data, { resultType: "mentions", groups }),
      tokenUsage,
    };
  },
  formatter: formatByResultType("mentions", formatMentionResults),
};

export const mentionTools: ToolDef[] = [searchMentions];
