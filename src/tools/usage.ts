import { apiPost } from "../client.js";
import type { ToolDef } from "../types.js";
import { formatUsageResults } from "../formatters.js";
export const getApiUsage: ToolDef = {
  name: "get_api_usage",
  description: `Check API token usage (tokens used and available) for the current API key.

USE THIS WHEN checking remaining quota before large queries or when the user asks about API limits.`,
  inputSchema: {
    type: "object",
    properties: {},
  },
  // No tokenUsage: the result is account usage, not a call cost, so no footer.
  handler: async () => {
    const { data } = await apiPost("/usage", {});
    return { data };
  },
  formatter: formatUsageResults,
};

export const usageTools: ToolDef[] = [getApiUsage];
