import { apiPost } from "../client.js";
import type { ToolDef } from "../types.js";
import { buildSearchBody, queryProp } from "../query.js";
import {
  contentFilterProps,
  RARE_FILTER_KEYS,
  buildAggregateBody,
  flattenOptions,
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

const rareShared = new Set<string>(RARE_FILTER_KEYS);
const sharedFilterProps = Object.fromEntries(
  SHARED_FILTER_KEYS.filter((k) => !rareShared.has(k)).map((k) => [
    k,
    contentFilterProps[k],
  ]),
);
const sharedRareProps = Object.fromEntries(
  SHARED_FILTER_KEYS.filter((k) => rareShared.has(k)).map((k) => [
    k,
    contentFilterProps[k],
  ]),
);

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

const MENTIONS_PATH = "/eventType/mention";
const MENTIONS_ACTION = "getMentions";

// The mentions endpoint has no forceMaxDataTimeWindow; bound the window by date.
const MENTION_SEARCH_OPTIONS = { dateDefault: "dateStart" as const };

const MENTION_LIST_PARAMS = [
  "mentionsPage",
  "mentionsCount",
  "mentionsSortBy",
  "mentionsSortByAsc",
] as const;

export const searchMentions: ToolDef = {
  name: "search_mentions",
  description: `Search sentences that state a kind of happening (acquisition, layoffs, product launch, recall, lawsuit, disaster; ~100 event types): each result is one sentence with its entities, sentiment and article link (100 per call). Resolve the type with suggest(type: "eventTypes") first. Use when the question names a kind of happening; search_articles for general coverage.
Example: search_mentions({eventTypeUri: "<uri>", conceptUri: "<uri>", dateStart: "2025-01-01"})`,
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
      ...queryProp("mentions"),
      options: {
        type: "object",
        description:
          "Rare filters as a nested object (sentiment, source rank, industry/SDG/SASB/ESG tags, sentence position, duplicates).",
        properties: {
          ...sharedRareProps,
          ...mentionRareProps,
          mentionsSortByAsc: {
            type: "boolean",
            description: "Ascending sort order. Default: false.",
          },
        },
      },
    },
  },
  handler: async (raw) => {
    const params = flattenOptions(raw);
    const resultType = (params.resultType as string) || "mentions";
    if (resultType !== "mentions") {
      const { body, notes } = buildAggregateBody(
        params,
        resultType,
        MENTION_LIST_PARAMS,
        MENTION_SEARCH_OPTIONS,
      );
      body.action = MENTIONS_ACTION;
      return { ...(await apiPost(MENTIONS_PATH, body)), notes };
    }

    params.mentionsCount ??= 100;
    const groups = parseFieldGroups(params.includeFields as string | undefined);
    const { body, notes } = buildSearchBody(params, MENTION_SEARCH_OPTIONS);
    body.action = MENTIONS_ACTION;
    body.resultType = "mentions";
    Object.assign(body, getMentionIncludeParams(groups));

    const { data, tokenUsage } = await apiPost(MENTIONS_PATH, body);
    return {
      data: filterResponse(data, { resultType: "mentions", groups }),
      tokenUsage,
      notes,
    };
  },
  formatter: formatByResultType("mentions", formatMentionResults),
};

export const mentionTools: ToolDef[] = [searchMentions];
