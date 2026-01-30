import { apiPost } from "../client.js";
import type { ToolDef } from "../types.js";

export const getTopicPageArticles: ToolDef = {
  name: "get_topic_page_articles",
  description:
    "Get articles matching a user-created topic page. Topic pages are pre-configured search profiles created on newsapi.ai.",
  inputSchema: {
    type: "object",
    properties: {
      uri: {
        type: "string",
        description: "Topic page URI.",
      },
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
    const body: Record<string, unknown> = {
      uri: params.uri,
      resultType: "articles",
      articleBodyLen: -1,
    };
    if (params.articlesPage) body.articlesPage = params.articlesPage;
    if (params.articlesCount) body.articlesCount = params.articlesCount;
    if (params.articlesSortBy) body.articlesSortBy = params.articlesSortBy;
    return apiPost("/article/getArticlesForTopicPage", body);
  },
};

export const getTopicPageEvents: ToolDef = {
  name: "get_topic_page_events",
  description:
    "Get events matching a user-created topic page. Topic pages are pre-configured search profiles created on newsapi.ai.",
  inputSchema: {
    type: "object",
    properties: {
      uri: {
        type: "string",
        description: "Topic page URI.",
      },
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
    const body: Record<string, unknown> = {
      uri: params.uri,
      resultType: "events",
    };
    if (params.eventsPage) body.eventsPage = params.eventsPage;
    if (params.eventsCount) body.eventsCount = params.eventsCount;
    if (params.eventsSortBy) body.eventsSortBy = params.eventsSortBy;
    return apiPost("/event/getEventsForTopicPage", body);
  },
};

export const topicPageTools: ToolDef[] = [
  getTopicPageArticles,
  getTopicPageEvents,
];
