import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

// Mock the client module before importing tools
vi.mock("../src/client.js", () => ({
  apiPost: vi.fn().mockResolvedValue({ data: { mocked: true } }),
  parseArray: vi.fn((v: unknown) => {
    if (v === undefined || v === null) return undefined;
    if (Array.isArray(v)) return v.map(String);
    const s = String(v).trim();
    if (s.startsWith("[")) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed.map(String);
        return [String(parsed)];
      } catch {
        // fall through
      }
    }
    if (/https?:\/\//.test(s)) {
      return s.split(/,(?=\s*https?:\/\/)/).map((x: string) => x.trim());
    }
    return s.split(",").map((x: string) => x.trim());
  }),
  initClient: vi.fn(),
}));

import { apiPost } from "../src/client.js";
import { allTools } from "../src/tools/index.js";

const mockedApiPost = vi.mocked(apiPost);

const VALID_JSON_SCHEMA_TYPES = [
  "string",
  "integer",
  "number",
  "boolean",
  "object",
  "array",
];

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------- Schema structure ----------

describe("tool schema structure", () => {
  it("has at least 8 tools", () => {
    expect(allTools.length).toBeGreaterThanOrEqual(8);
  });

  for (const tool of allTools) {
    describe(`${tool.name}`, () => {
      it("has non-empty name and description", () => {
        expect(tool.name).toBeTruthy();
        expect(tool.description).toBeTruthy();
        expect(tool.name.length).toBeGreaterThan(0);
        expect(tool.description.length).toBeGreaterThan(0);
      });

      it("has inputSchema with type=object and properties object", () => {
        expect(tool.inputSchema.type).toBe("object");
        expect(typeof tool.inputSchema.properties).toBe("object");
        expect(tool.inputSchema.properties).not.toBeNull();
      });

      it("has a handler function", () => {
        expect(typeof tool.handler).toBe("function");
      });

      it("every required field exists in properties", () => {
        const required = tool.inputSchema.required ?? [];
        const propKeys = Object.keys(tool.inputSchema.properties);
        for (const req of required) {
          expect(
            propKeys,
            `required field "${req}" missing from properties`,
          ).toContain(req);
        }
      });

      it("every property has a valid type", () => {
        for (const [key, schemaDef] of Object.entries(
          tool.inputSchema.properties,
        )) {
          const def = schemaDef as Record<string, unknown>;
          // oneOf is a valid alternative to type (e.g. string | string[])
          if (def.oneOf) continue;
          const typeDef = def.type;
          if (Array.isArray(typeDef)) {
            for (const t of typeDef) {
              expect(
                VALID_JSON_SCHEMA_TYPES,
                `property "${key}" has invalid type "${t}"`,
              ).toContain(t);
            }
          } else {
            expect(
              VALID_JSON_SCHEMA_TYPES,
              `property "${key}" has invalid type "${typeDef}"`,
            ).toContain(typeDef);
          }
        }
      });

      it("every property has a description string", () => {
        for (const [key, schemaDef] of Object.entries(
          tool.inputSchema.properties,
        )) {
          const def = schemaDef as Record<string, unknown>;
          expect(
            typeof def.description,
            `property "${key}" missing description`,
          ).toBe("string");
          expect(
            (def.description as string).length,
            `property "${key}" has empty description`,
          ).toBeGreaterThan(0);
        }
      });

      it("every enum is a non-empty array of strings", () => {
        for (const [key, schemaDef] of Object.entries(
          tool.inputSchema.properties,
        )) {
          const def = schemaDef as Record<string, unknown>;
          if (def.enum !== undefined) {
            expect(
              Array.isArray(def.enum),
              `property "${key}" enum is not an array`,
            ).toBe(true);
            const enumArr = def.enum as unknown[];
            expect(
              enumArr.length,
              `property "${key}" enum is empty`,
            ).toBeGreaterThan(0);
            const allowedType =
              def.type === "integer" || def.type === "number"
                ? "number"
                : "string";
            for (const val of enumArr) {
              expect(
                typeof val,
                `property "${key}" enum contains unexpected type`,
              ).toBe(allowedType);
            }
          }
        }
      });
    });
  }
});

// ---------- Zod schema conversion ----------

describe("zod schema conversion", () => {
  for (const tool of allTools) {
    it(`${tool.name} converts to zod without throwing`, () => {
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

      // Should not throw
      const schema = z.object(shape);
      expect(schema).toBeDefined();
      expect(typeof schema.parse).toBe("function");
    });
  }
});

// ---------- Handler smoke tests ----------

describe("handler smoke tests", () => {
  /**
   * Build minimal valid params: required fields get a dummy value
   * matching their type, optional fields are omitted.
   */
  function buildMinimalParams(tool: (typeof allTools)[number]) {
    const params: Record<string, unknown> = {};
    const required = tool.inputSchema.required ?? [];

    for (const key of required) {
      const def = tool.inputSchema.properties[key] as Record<string, unknown>;
      const typeDef = def.type;

      if (
        typeDef === "integer" ||
        typeDef === "number" ||
        (Array.isArray(typeDef) && typeDef.includes("number"))
      ) {
        params[key] = 1;
      } else if (typeDef === "boolean") {
        params[key] = true;
      } else if (Array.isArray(typeDef) && typeDef.includes("object")) {
        params[key] = {};
      } else {
        // string — use first enum value if available, else dummy
        if (def.enum && Array.isArray(def.enum) && def.enum.length > 0) {
          params[key] = def.enum[0];
        } else {
          params[key] = "test-value";
        }
      }
    }

    return params;
  }

  for (const tool of allTools) {
    it(`${tool.name} handler does not throw with required-only params`, async () => {
      const params = buildMinimalParams(tool);

      // Should not throw
      await tool.handler(params);

      // Handler should have called the API function
      expect(
        mockedApiPost.mock.calls.length,
        `${tool.name} handler did not call apiPost`,
      ).toBeGreaterThan(0);
    });
  }
});
