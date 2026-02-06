import { apiPost } from "../client.js";
import type { ToolDef } from "../types.js";
import { formatUsageResults } from "../formatters.js";
import { formatControlProp } from "./articles.js";

export const getApiUsage: ToolDef = {
  name: "get_api_usage",
  category: "usage",
  description:
    "Check API token usage and plan details for the current API key.",
  inputSchema: {
    type: "object",
    properties: {
      ...formatControlProp,
    },
  },
  handler: async () => {
    return apiPost("/usage", {});
  },
  formatter: formatUsageResults,
};

export const usageTools: ToolDef[] = [getApiUsage];
