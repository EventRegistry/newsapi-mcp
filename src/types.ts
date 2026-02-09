/** Output format for tool responses. */
export type FormatType = "json" | "text";

/** Formatter function signature. */
export type ResponseFormatter = (
  data: unknown,
  params: Record<string, unknown>,
) => string;

/** Tool definition for MCP registration. */
export interface ToolDef {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: (params: Record<string, unknown>) => Promise<unknown>;
  /** Optional text formatter. If provided, tool supports format: "text". */
  formatter?: ResponseFormatter;
}

/** Semantic error categories for LLM-friendly diagnostics. */
export type ErrorCategory =
  | "auth_error"
  | "rate_limit"
  | "invalid_param"
  | "not_found"
  | "api_error"
  | "network_error";

/** Classify an HTTP status code into a semantic error category. */
export function classifyError(status: number): ErrorCategory {
  if (status === 401 || status === 403) return "auth_error";
  if (status === 429) return "rate_limit";
  if (status === 400) return "invalid_param";
  if (status === 404) return "not_found";
  if (status >= 500) return "api_error";
  return "api_error";
}

/** Standard API error response with semantic category. */
export class ApiError extends Error {
  public category: ErrorCategory;
  public isRetryable: boolean;

  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`API error ${status}: ${JSON.stringify(body)}`);
    this.name = "ApiError";
    this.category = classifyError(status);
    this.isRetryable =
      this.category === "rate_limit" || this.category === "api_error";
  }
}
