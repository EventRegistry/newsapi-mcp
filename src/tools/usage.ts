import { apiPost } from "../client.js";
import type { ToolDef } from "../types.js";
import { formatUsageResults } from "../formatters.js";
export const getApiUsage: ToolDef = {
  name: "get_api_usage",
  description: `Check API token usage and plan details for the current API key.

USE THIS WHEN checking remaining quota before large queries or when the user asks about API limits.`,
  inputSchema: {
    type: "object",
    properties: {},
  },
  handler: async () => {
    return apiPost("/usage", {});
  },
  formatter: formatUsageResults,
};

export const usageTools: ToolDef[] = [getApiUsage];
