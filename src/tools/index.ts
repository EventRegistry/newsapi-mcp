import { searchTools } from "./search.js";
import { articleTools } from "./articles.js";
import { eventTools } from "./events.js";
import { topicPageTools } from "./topic-pages.js";
import { usageTools } from "./usage.js";
import { suggestTools } from "./suggest.js";
import type { ToolDef } from "../types.js";

export { ToolRegistry } from "./registry.js";

export const allTools: ToolDef[] = [
  ...searchTools,
  ...articleTools,
  ...eventTools,
  ...topicPageTools,
  ...suggestTools,
  ...usageTools,
];
