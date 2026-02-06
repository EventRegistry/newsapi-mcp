/** Output format for tool responses. */
export type FormatType = "json" | "text";

/** Formatter function signature. */
export type ResponseFormatter = (
  data: unknown,
  params: Record<string, unknown>,
) => string;

/** Tool category for grouping and dynamic registration. */
export type ToolCategory = "search" | "suggest" | "topic_pages" | "usage";

/** Tool definition for MCP registration. */
export interface ToolDef {
  name: string;
  description: string;
  category: ToolCategory;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: (params: Record<string, unknown>) => Promise<unknown>;
  /** Optional text formatter. If provided, tool supports format: "text". */
  formatter?: ResponseFormatter;
}

/** Standard API error response. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`API error ${status}: ${JSON.stringify(body)}`);
    this.name = "ApiError";
  }
}
