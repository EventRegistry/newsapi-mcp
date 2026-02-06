import { apiPost } from "../client.js";
import { responseControlProps, includeFieldsProp } from "./articles.js";
import type { ToolDef } from "../types.js";
import {
  parseFieldGroups,
  getArticleIncludeParams,
  getEventIncludeParams,
  filterResponse,
} from "../response-filter.js";

export const getTopicPageArticles: ToolDef = {
  name: "get_topic_page_articles",
  category: "topic_pages",
  description:
    "Get articles matching a user-created topic page. Topic pages are pre-configured search profiles created on newsapi.ai.",
  inputSchema: {
    type: "object",
    properties: {
      uri: {
        type: "string",
        description: "Topic page URI.",
      },
      ...responseControlProps,
      articlesPage: {
        type: "integer",
        description: "Page number (starting from 1). Default: 1.",
      },
      articlesCount: {
        type: "integer",
        description: "Articles per page (max 100). Default: 100.",
        default: 100,
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
    const groups = parseFieldGroups(params.includeFields as string | undefined);
    const bodyLen =
      params.articleBodyLen !== undefined
        ? (params.articleBodyLen as number)
        : -1;

    const body: Record<string, unknown> = {
      uri: params.uri,
      resultType: "articles",
      articleBodyLen: bodyLen,
      ...getArticleIncludeParams(groups),
    };
    if (params.articlesPage) body.articlesPage = params.articlesPage;
    if (params.articlesCount) body.articlesCount = params.articlesCount;
    if (params.articlesSortBy) body.articlesSortBy = params.articlesSortBy;

    const result = await apiPost("/article/getArticlesForTopicPage", body);
    return filterResponse(result, {
      resultType: "articles",
      groups,
      bodyLen,
    });
  },
};

export const getTopicPageEvents: ToolDef = {
  name: "get_topic_page_events",
  category: "topic_pages",
  description:
    "Get events matching a user-created topic page. Topic pages are pre-configured search profiles created on newsapi.ai.",
  inputSchema: {
    type: "object",
    properties: {
      uri: {
        type: "string",
        description: "Topic page URI.",
      },
      ...includeFieldsProp,
      eventsPage: {
        type: "integer",
        description: "Page number (starting from 1). Default: 1.",
      },
      eventsCount: {
        type: "integer",
        description: "Events per page (max 50). Default: 50.",
        default: 50,
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
    const groups = parseFieldGroups(params.includeFields as string | undefined);

    const body: Record<string, unknown> = {
      uri: params.uri,
      resultType: "events",
      ...getEventIncludeParams(groups),
    };
    if (params.eventsPage) body.eventsPage = params.eventsPage;
    if (params.eventsCount) body.eventsCount = params.eventsCount;
    if (params.eventsSortBy) body.eventsSortBy = params.eventsSortBy;

    const result = await apiPost("/event/getEventsForTopicPage", body);
    return filterResponse(result, { resultType: "events", groups });
  },
};

export const topicPageTools: ToolDef[] = [
  getTopicPageArticles,
  getTopicPageEvents,
];
