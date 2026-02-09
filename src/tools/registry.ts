import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ApiError } from "../types.js";
import type { ToolDef, FormatType } from "../types.js";
import { formatErrorResponse, formatUnknownError } from "../errors.js";
import { validateFieldGroups } from "../response-filter.js";
import { z } from "zod";

/** Build a zod shape from a ToolDef's JSON schema properties. */
function buildZodShape(tool: ToolDef): Record<string, z.ZodTypeAny> {
  const shape: Record<string, z.ZodTypeAny> = {};
  const props = tool.inputSchema.properties;
  const required = new Set(tool.inputSchema.required ?? []);

  for (const [key, schemaDef] of Object.entries(props)) {
    const def = schemaDef as Record<string, unknown>;
    let field: z.ZodTypeAny;

    const typeDef = def.type;
    if (
      typeDef === "integer" ||
      typeDef === "number" ||
      (Array.isArray(typeDef) && typeDef.includes("number"))
    ) {
      field = z.number();
    } else if (typeDef === "boolean") {
      field = z.boolean();
    } else if (Array.isArray(typeDef) && typeDef.includes("object")) {
      field = z.any();
    } else {
      field = z.string();
    }

    if (def.description) {
      field = field.describe(def.description as string);
    }

    if (def.enum && Array.isArray(def.enum)) {
      const values = def.enum as unknown[];
      if (values.length > 0) {
        const desc = (def.description as string) || "";
        if (values.every((v) => typeof v === "string")) {
          field = z.enum(values as [string, ...string[]]).describe(desc);
        } else {
          const literals = values.map((v) => z.literal(v as number));
          field = z
            .union(
              literals as [
                z.ZodLiteral<number>,
                z.ZodLiteral<number>,
                ...z.ZodLiteral<number>[],
              ],
            )
            .describe(desc);
        }
      }
    }

    if (!required.has(key)) {
      field = field.optional();
    }

    shape[key] = field;
  }

  return shape;
}

/** Manages tool registration on an McpServer. */
export class ToolRegistry {
  private allTools: ToolDef[] = [];

  constructor(tools: ToolDef[]) {
    this.allTools = tools;
  }

  /** Register a single ToolDef on the McpServer. */
  private registerTool(tool: ToolDef): void {
    if (!this.server) return;

    const shape = buildZodShape(tool);
    const handler = tool.handler;
    const formatter = tool.formatter;
    const hasFormatParam = "format" in tool.inputSchema.properties;
    const hasIncludeFields = "includeFields" in tool.inputSchema.properties;

    this.server.tool(
      tool.name,
      tool.description,
      z.object(shape).shape,
      async (params) => {
        try {
          // Validate includeFields before calling handler
          const fieldWarnings = hasIncludeFields
            ? validateFieldGroups(params.includeFields as string | undefined)
            : [];

          const result = await handler(
            params as unknown as Record<string, unknown>,
          );

          const format = (params.format as FormatType) || "json";
          const useFormatter =
            formatter && (!hasFormatParam || format === "text");
          let text = useFormatter
            ? formatter(result, params as Record<string, unknown>)
            : JSON.stringify(result);

          if (fieldWarnings.length > 0) {
            text += "\n\n⚠ " + fieldWarnings.join("\n⚠ ");
          }

          return {
            content: [{ type: "text" as const, text }],
          };
        } catch (err) {
          const message =
            err instanceof ApiError
              ? formatErrorResponse(err)
              : formatUnknownError(err);
          return {
            content: [{ type: "text" as const, text: message }],
            isError: true,
          };
        }
      },
    );
  }

  private server: McpServer | null = null;

  /** Register all tools on the server. */
  attach(server: McpServer): void {
    this.server = server;

    for (const tool of this.allTools) {
      this.registerTool(tool);
    }
  }
}
