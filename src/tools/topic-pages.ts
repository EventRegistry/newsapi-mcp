import { apiPost } from "../client.js";
import {
  responseControlProps,
  includeFieldsProp,
  detailLevelProp,
  applyDetailLevel,
} from "./articles.js";
import type { ToolDef } from "../types.js";
import {
  parseFieldGroups,
  getArticleIncludeParams,
  getEventIncludeParams,
  filterResponse,
} from "../response-filter.js";
import { formatArticleResults, formatEventResults } from "../formatters.js";

export const getTopicPageArticles: ToolDef = {
  name: "get_topic_page_articles",
  description: `Get articles matching a user-created topic page. Topic pages are pre-configured search profiles on newsapi.ai.

EXAMPLE: get_topic_page_articles({uri: "<topic-page-uri>", detailLevel: "minimal"})

USE THIS WHEN monitoring a pre-configured topic. NOT THIS for ad-hoc searches — use search_articles.`,
  inputSchema: {
    type: "object",
    properties: {
      uri: {
        type: "string",
        description: "Topic page URI.",
      },
      ...responseControlProps,
      ...detailLevelProp,
      articlesPage: {
        type: "integer",
        description: "Page number (starting from 1). Default: 1.",
      },
      articlesCount: {
        type: "integer",
        description: "Articles per page (max 100). Default set by detailLevel.",
        maximum: 100,
      },
      articlesSortBy: {
        type: "string",
        description:
          'Sort by: "date", "rel", "sourceImportance", "socialScore". Default: "date".',
        enum: ["date", "rel", "sourceImportance", "socialScore"],
      },
    },
    required: ["uri"],
  },
  handler: async (params) => {
    applyDetailLevel(params);
    const groups = parseFieldGroups(params.includeFields as string | undefined);
    const bodyLen = (params.articleBodyLen as number) ?? -1;

    const body: Record<string, unknown> = {
      uri: params.uri,
      resultType: "articles",
      articleBodyLen: bodyLen,
      ...getArticleIncludeParams(groups),
    };
    if (params.articlesPage) body.articlesPage = params.articlesPage;
    body.articlesCount = params.articlesCount;
    if (params.articlesSortBy) body.articlesSortBy = params.articlesSortBy;

    const { data, tokenUsage } = await apiPost(
      "/article/getArticlesForTopicPage",
      body,
    );
    return {
      data: filterResponse(data, {
        resultType: "articles",
        groups,
        bodyLen,
      }),
      tokenUsage,
    };
  },
  formatter: formatArticleResults,
};

export const getTopicPageEvents: ToolDef = {
  name: "get_topic_page_events",
  description: `Get events matching a user-created topic page. Topic pages are pre-configured search profiles on newsapi.ai.

EXAMPLE: get_topic_page_events({uri: "<topic-page-uri>", eventsSortBy: "size"})

USE THIS WHEN monitoring a pre-configured topic for events. NOT THIS for ad-hoc searches — use search_events.`,
  inputSchema: {
    type: "object",
    properties: {
      uri: {
        type: "string",
        description: "Topic page URI.",
      },
      ...includeFieldsProp,
      ...detailLevelProp,
      eventsPage: {
        type: "integer",
        description: "Page number (starting from 1). Default: 1.",
      },
      eventsCount: {
        type: "integer",
        description: "Events per page (max 50). Default set by detailLevel.",
        maximum: 50,
      },
      eventsSortBy: {
        type: "string",
        description:
          'Sort by: "date", "rel", "size", "socialScore". Default: "date".',
        enum: ["date", "rel", "size", "socialScore"],
      },
    },
    required: ["uri"],
  },
  handler: async (params) => {
    applyDetailLevel(params);
    const groups = parseFieldGroups(params.includeFields as string | undefined);

    const body: Record<string, unknown> = {
      uri: params.uri,
      resultType: "events",
      ...getEventIncludeParams(groups),
    };
    if (params.eventsPage) body.eventsPage = params.eventsPage;
    body.eventsCount = params.eventsCount;
    if (params.eventsSortBy) body.eventsSortBy = params.eventsSortBy;

    const { data, tokenUsage } = await apiPost(
      "/event/getEventsForTopicPage",
      body,
    );
    return {
      data: filterResponse(data, { resultType: "events", groups }),
      tokenUsage,
    };
  },
  formatter: formatEventResults,
};

export const topicPageTools: ToolDef[] = [
  getTopicPageArticles,
  getTopicPageEvents,
];
