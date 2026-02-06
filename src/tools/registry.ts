import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolCategory, ToolDef, FormatType } from "../types.js";
import { z } from "zod";

/** Which tools are core (on by default) within each category. */
const CORE_TOOLS: Record<ToolCategory, string[] | "all"> = {
  search: ["search_articles", "search_events"],
  suggest: ["suggest_concepts"],
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
      const values = def.enum as string[];
      if (values.length > 0) {
        field = z
          .enum(values as [string, ...string[]])
          .describe((def.description as string) || "");
      }
    }

    if (!required.has(key)) {
      field = field.optional();
    }

    shape[key] = field;
  }

  return shape;
}

/** Manages dynamic tool registration on an McpServer. */
export class ToolRegistry {
  private allTools: ToolDef[] = [];
  private enabledCategories = new Set<ToolCategory>();
  /** Tracks McpServer RegisteredTool handles keyed by tool name. */
  private registered = new Map<
    string,
    { remove: () => void; update: (updates: object) => void }
  >();
  private server: McpServer | null = null;

  constructor(tools: ToolDef[]) {
    this.allTools = tools;

    // Determine default enabled set
    for (const tool of tools) {
      const core = CORE_TOOLS[tool.category];
      if (core === "all" || core.includes(tool.name)) {
        this.enabledCategories.add(tool.category);
      }
    }
  }

  /** Tools that should be registered given current enabled categories. */
  private getActiveTools(): ToolDef[] {
    return this.allTools.filter((tool) => {
      const core = CORE_TOOLS[tool.category];
      if (!this.enabledCategories.has(tool.category)) return false;
      if (core === "all") return true;
      // If category is enabled, check if it was fully enabled or just core
      return this.isFullyEnabled(tool.category) || core.includes(tool.name);
    });
  }

  /** Track which categories have been fully enabled (all tools). */
  private fullyEnabled = new Set<ToolCategory>();

  private isFullyEnabled(category: ToolCategory): boolean {
    return this.fullyEnabled.has(category);
  }

  /** Register a single ToolDef on the McpServer. */
  private registerTool(tool: ToolDef): void {
    if (!this.server || this.registered.has(tool.name)) return;

    const shape = buildZodShape(tool);
    const handler = tool.handler;
    const formatter = tool.formatter;
    const hasFormatParam = "format" in tool.inputSchema.properties;

    const handle = this.server.tool(
      tool.name,
      tool.description,
      z.object(shape).shape,
      async (params) => {
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

    this.registered.set(tool.name, handle);
  }

  /** Unregister a tool by name. */
  private unregisterTool(name: string): void {
    const handle = this.registered.get(name);
    if (handle) {
      handle.remove();
      this.registered.delete(name);
    }
  }

  /** Register meta-tools and initial tool set on the server. */
  attach(server: McpServer): void {
    this.server = server;
    this.registerMetaTools();

    // Register default active tools
    for (const tool of this.getActiveTools()) {
      this.registerTool(tool);
    }
  }

  /** Enable a category (all tools in it). Returns list of newly added tool names. */
  enableCategory(category: ToolCategory): string[] {
    this.enabledCategories.add(category);
    this.fullyEnabled.add(category);

    const added: string[] = [];
    for (const tool of this.allTools) {
      if (tool.category === category && !this.registered.has(tool.name)) {
        this.registerTool(tool);
        added.push(tool.name);
      }
    }
    return added;
  }

  /** Disable a category. Returns list of removed tool names. */
  disableCategory(category: ToolCategory): string[] {
    this.fullyEnabled.delete(category);

    const core = CORE_TOOLS[category];
    const removed: string[] = [];

    for (const tool of this.allTools) {
      if (tool.category !== category) continue;
      // Keep core tools registered
      if (core === "all" || core.includes(tool.name)) continue;
      if (this.registered.has(tool.name)) {
        this.unregisterTool(tool.name);
        removed.push(tool.name);
      }
    }

    // If no core tools exist for this category, fully remove it
    if (core !== "all" && core.length === 0) {
      this.enabledCategories.delete(category);
    }

    return removed;
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
      if (this.registered.has(tool.name)) {
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
                    ? `Enabled ${category}: added ${changed.join(", ")}`
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
                    ? `Disabled ${category}: removed ${changed.join(", ")}`
                    : `Category ${category} has no non-core tools to disable`,
              },
            ],
          };
        }
      },
    );
  }
}
