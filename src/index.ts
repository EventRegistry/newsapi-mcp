#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { initClient } from "./client.js";
import { allTools } from "./tools/index.js";
import type { FormatType } from "./types.js";

const apiKey = process.env.NEWSAPI_KEY;
if (!apiKey) {
  console.error("NEWSAPI_KEY environment variable is required");
  process.exit(1);
}
initClient(apiKey);

const server = new McpServer({
  name: "newsapi",
  version: "1.0.0",
});

// Register all tools
for (const tool of allTools) {
  // Build a zod schema from the JSON schema properties
  const shape: Record<string, z.ZodTypeAny> = {};
  const props = tool.inputSchema.properties;
  const required = new Set(tool.inputSchema.required ?? []);

  for (const [key, schemaDef] of Object.entries(props)) {
    const def = schemaDef as Record<string, unknown>;
    let field: z.ZodTypeAny;

    // Map JSON schema type to zod
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
      // Accept object or string (for query param)
      field = z.any();
    } else {
      field = z.string();
    }

    // Add description
    if (def.description) {
      field = field.describe(def.description as string);
    }

    // Handle enum constraints
    if (def.enum && Array.isArray(def.enum)) {
      const values = def.enum as string[];
      if (values.length > 0) {
        field = z
          .enum(values as [string, ...string[]])
          .describe((def.description as string) || "");
      }
    }

    // Make optional if not required
    if (!required.has(key)) {
      field = field.optional();
    }

    shape[key] = field;
  }

  const handler = tool.handler;
  const formatter = tool.formatter;
  const hasFormatParam = "format" in props;
  server.tool(
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
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
