import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolCategory, ToolDef, FormatType } from "../types.js";
import { z } from "zod";

/** Which tools are core (on by default) within each category. */
const CORE_TOOLS: Record<ToolCategory, string[] | "all"> = {
  search: ["search_articles", "search_events"],
  suggest: "all",
  topic_pages: [],
  usage: "all",
};

/** Human-readable category descriptions. */
const CATEGORY_DESCRIPTIONS: Record<ToolCategory, string> = {
  search: "Article and event search, details, and text matching",
  suggest: "URI lookup for concepts, categories, sources, locations, authors",
  topic_pages: "Topic page article and event retrieval",
  usage: "API usage and plan details",
};

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

/** Manages tool registration on an McpServer. All tools are registered at
 *  startup; enable/disable is enforced at the handler level. */
export class ToolRegistry {
  private allTools: ToolDef[] = [];
  /** Categories whose non-core tools are active. */
  private fullyEnabled = new Set<ToolCategory>();
  private server: McpServer | null = null;

  constructor(tools: ToolDef[]) {
    this.allTools = tools;
  }

  /** Whether a specific tool is currently enabled. */
  private isToolEnabled(tool: ToolDef): boolean {
    const core = CORE_TOOLS[tool.category];
    if (core === "all") return true;
    if (core.includes(tool.name)) return true;
    return this.fullyEnabled.has(tool.category);
  }

  /** Register a single ToolDef on the McpServer with handler-level gating. */
  private registerTool(tool: ToolDef): void {
    if (!this.server) return;

    const shape = buildZodShape(tool);
    const handler = tool.handler;
    const formatter = tool.formatter;
    const hasFormatParam = "format" in tool.inputSchema.properties;

    this.server.tool(
      tool.name,
      tool.description,
      z.object(shape).shape,
      async (params) => {
        // Gate: reject calls to disabled tools
        if (!this.isToolEnabled(tool)) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Tool ${tool.name} is not enabled. Use enable_toolset(category='${tool.category}', enabled=true) to enable it.`,
              },
            ],
            isError: true,
          };
        }

        try {
          const result = await handler(
            params as unknown as Record<string, unknown>,
          );

          const format = (params.format as FormatType) || "json";
          const useFormatter =
            formatter && (!hasFormatParam || format === "text");
          const text = useFormatter
            ? formatter(result, params as Record<string, unknown>)
            : JSON.stringify(result);

          return {
            content: [{ type: "text" as const, text }],
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            content: [{ type: "text" as const, text: message }],
            isError: true,
          };
        }
      },
    );
  }

  /** Register meta-tools and ALL tools on the server. */
  attach(server: McpServer): void {
    this.server = server;
    this.registerMetaTools();

    for (const tool of this.allTools) {
      this.registerTool(tool);
    }
  }

  /** Enable a category (all tools in it). Returns list of newly enabled tool names. */
  enableCategory(category: ToolCategory): string[] {
    if (this.fullyEnabled.has(category)) return [];
    this.fullyEnabled.add(category);

    const core = CORE_TOOLS[category];
    return this.allTools
      .filter(
        (t) =>
          t.category === category && core !== "all" && !core.includes(t.name),
      )
      .map((t) => t.name);
  }

  /** Disable a category (non-core tools). Returns list of disabled tool names. */
  disableCategory(category: ToolCategory): string[] {
    if (!this.fullyEnabled.has(category)) return [];
    this.fullyEnabled.delete(category);

    const core = CORE_TOOLS[category];
    return this.allTools
      .filter(
        (t) =>
          t.category === category && core !== "all" && !core.includes(t.name),
      )
      .map((t) => t.name);
  }

  /** Get category info for list_available_tools output. */
  getCategoryInfo(): Array<{
    category: string;
    description: string;
    enabled: string[];
    disabled: string[];
  }> {
    const categories = new Map<
      ToolCategory,
      { enabled: string[]; disabled: string[] }
    >();

    for (const tool of this.allTools) {
      if (!categories.has(tool.category)) {
        categories.set(tool.category, { enabled: [], disabled: [] });
      }
      const entry = categories.get(tool.category)!;
      if (this.isToolEnabled(tool)) {
        entry.enabled.push(tool.name);
      } else {
        entry.disabled.push(tool.name);
      }
    }

    const result = [];
    for (const [category, tools] of categories) {
      result.push({
        category,
        description: CATEGORY_DESCRIPTIONS[category],
        ...tools,
      });
    }
    return result;
  }

  /** All valid category names. */
  getCategories(): ToolCategory[] {
    const seen = new Set<ToolCategory>();
    for (const tool of this.allTools) {
      seen.add(tool.category);
    }
    return [...seen];
  }

  private registerMetaTools(): void {
    if (!this.server) return;

    const registry = this;
    const validCategories = this.getCategories();

    this.server.tool(
      "list_available_tools",
      "List all tool categories with their enabled/disabled status. Use enable_toolset to toggle categories on or off.",
      {},
      async () => {
        const info = registry.getCategoryInfo();
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(info, null, 2) },
          ],
        };
      },
    );

    this.server.tool(
      "enable_toolset",
      "Enable or disable a tool category. Use list_available_tools to see available categories.",
      {
        category: z
          .enum(validCategories as [string, ...string[]])
          .describe("The tool category to enable or disable."),
        enabled: z
          .boolean()
          .describe("true to enable, false to disable.")
          .default(true),
      },
      async (params) => {
        const category = params.category as ToolCategory;
        const enabled = params.enabled as boolean;

        let changed: string[];
        if (enabled) {
          changed = registry.enableCategory(category);
          return {
            content: [
              {
                type: "text" as const,
                text:
                  changed.length > 0
                    ? `Enabled ${category}: ${changed.join(", ")}`
                    : `Category ${category} already fully enabled`,
              },
            ],
          };
        } else {
          changed = registry.disableCategory(category);
          return {
            content: [
              {
                type: "text" as const,
                text:
                  changed.length > 0
                    ? `Disabled ${category}: ${changed.join(", ")}`
                    : `Category ${category} has no non-core tools to disable`,
              },
            ],
          };
        }
      },
    );
  }
}
