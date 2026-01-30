import { articleTools } from "./articles.js";
import { eventTools } from "./events.js";
import { mentionTools } from "./mentions.js";
import { analyticsTools } from "./analytics.js";
import { topicPageTools } from "./topic-pages.js";
import { usageTools } from "./usage.js";
import { suggestTools } from "./suggest.js";
import type { ToolDef } from "../types.js";

export const allTools: ToolDef[] = [
  ...articleTools,
  ...eventTools,
  ...mentionTools,
  ...topicPageTools,
  ...analyticsTools,
  ...suggestTools,
  ...usageTools,
];
