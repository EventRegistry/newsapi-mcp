import { apiPost } from "../client.js";
import type { ToolDef } from "../types.js";

export const getApiUsage: ToolDef = {
  name: "get_api_usage",
  description:
    "Check API token usage and plan details for the current API key.",
  inputSchema: {
    type: "object",
    properties: {},
  },
  handler: async () => {
    return apiPost("/usage", {});
  },
};

export const usageTools: ToolDef[] = [getApiUsage];
