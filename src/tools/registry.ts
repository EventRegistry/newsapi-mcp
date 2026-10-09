import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ApiError } from "../types.js";
import type { ApiResponse, ToolDef } from "../types.js";
import { formatErrorResponse, formatUnknownError } from "../errors.js";
import { validateFieldGroups } from "../response-filter.js";
import { REPORTING_REMINDER } from "../instructions.js";
import { z } from "zod";

/** Build a zod shape from a ToolDef's JSON schema properties. */
function buildZodShape(tool: ToolDef): Record<string, z.ZodTypeAny> {
  return shapeFromProps(
    tool.inputSchema.properties,
    tool.inputSchema.required ?? [],
  );
}

/** Convert a JSON Schema `properties` map (nested objects included) to a zod shape. */
function shapeFromProps(
  props: Record<string, unknown>,
  requiredKeys: readonly string[],
): Record<string, z.ZodTypeAny> {
  const shape: Record<string, z.ZodTypeAny> = {};
  const required = new Set(requiredKeys);

  for (const [key, schemaDef] of Object.entries(props)) {
    const def = schemaDef as Record<string, unknown>;
    let field: z.ZodTypeAny;

    // Handle oneOf with string | string[] union
    if (Array.isArray(def.oneOf)) {
      const oneOf = def.oneOf as Record<string, unknown>[];
      const hasString = oneOf.some((o) => o.type === "string");
      const hasArray = oneOf.some(
        (o) =>
          o.type === "array" &&
          (o.items as Record<string, unknown>)?.type === "string",
      );
      if (hasString && hasArray) {
        field = z.union([z.string(), z.array(z.string())]);
      } else {
        field = z.any();
      }
    } else {
      const typeDef = def.type;
      if (
        typeDef === "integer" ||
        typeDef === "number" ||
        (Array.isArray(typeDef) && typeDef.includes("number"))
      ) {
        field = z.number();
      } else if (typeDef === "boolean") {
        field = z.boolean();
      } else if (typeDef === "object" && def.properties) {
        field = z.object(
          shapeFromProps(
            def.properties as Record<string, unknown>,
            (def.required as string[]) ?? [],
          ),
        );
      } else if (Array.isArray(typeDef) && typeDef.includes("object")) {
        field = z.any();
      } else {
        field = z.string();
      }
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
  private server: McpServer | null = null;

  /** `hosted` marks results as source material for the model. */
  constructor(
    tools: ToolDef[],
    private hosted = false,
  ) {
    this.allTools = tools;
  }

  /** Register a single ToolDef on the McpServer. */
  private registerOne(tool: ToolDef): void {
    if (!this.server) return;

    const shape = buildZodShape(tool);
    const handler = tool.handler;
    const formatter = tool.formatter;
    const hasIncludeFields = "includeFields" in tool.inputSchema.properties;

    this.server.registerTool(
      tool.name,
      {
        description: this.hosted
          ? `${tool.description}\n\n${REPORTING_REMINDER}`
          : tool.description,
        inputSchema: z.object(shape),
      },
      async (params) => {
        try {
          // Validate includeFields before calling handler
          const fieldWarnings = hasIncludeFields
            ? validateFieldGroups(params.includeFields as string | undefined)
            : [];

          const { data, tokenUsage, notes } = (await handler(
            params as unknown as Record<string, unknown>,
          )) as ApiResponse;

          let text = formatter
            ? formatter(data, params as Record<string, unknown>)
            : JSON.stringify(data);

          if (fieldWarnings.length > 0) {
            text += "\n\n⚠ " + fieldWarnings.join("\n⚠ ");
          }
          if (notes?.length) {
            text += "\n" + notes.map((n) => `Note: ${n}`).join("\n");
          }

          // Truncate before the client's own ~25k-token result cap drops the whole result.
          const MAX_RESPONSE_CHARS = 50_000;
          if (text.length > MAX_RESPONSE_CHARS) {
            const sep = "\n\n";
            let cut = text.lastIndexOf(sep, MAX_RESPONSE_CHARS);
            if (cut < MAX_RESPONSE_CHARS * 0.5) {
              cut = text.lastIndexOf("\n", MAX_RESPONSE_CHARS);
            }
            if (cut < MAX_RESPONSE_CHARS * 0.5) cut = MAX_RESPONSE_CHARS;
            text =
              text.slice(0, cut) +
              "\n\n⚠ Response truncated to fit context window. " +
              "Use fewer results (count), shorter bodies (articleBodyLen), " +
              "or pagination (page) to get remaining data.";
          }

          if (tokenUsage) {
            text +=
              `\n\n---\nTokens used: ${tokenUsage.reqTokens}` +
              ` | Remaining: ${tokenUsage.remaining}`;
          }

          if (this.hosted) {
            // Article text must not close the block before the reminder.
            const material = text.replaceAll("</source_material>", "");
            return {
              content: [
                {
                  type: "text" as const,
                  text: `<source_material>\n${material}\n</source_material>\n\n${REPORTING_REMINDER}`,
                  // Hint only: no known client hides it from the user.
                  annotations: { audience: ["assistant" as const] },
                },
              ],
            };
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

  /** Register all tools on the server. */
  attach(server: McpServer): void {
    this.server = server;

    for (const tool of this.allTools) {
      this.registerOne(tool);
    }
  }
}
