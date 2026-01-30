import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseArray,
  initClient,
  apiPost,
  analyticsPost,
} from "../src/client.js";
import { ApiError } from "../src/types.js";

describe("parseArray", () => {
  it("returns undefined for undefined", () => {
    expect(parseArray(undefined)).toBeUndefined();
  });

  it("returns undefined for null", () => {
    expect(parseArray(null)).toBeUndefined();
  });

  it("converts a single string to array", () => {
    expect(parseArray("value")).toEqual(["value"]);
  });

  it("splits comma-separated string and trims whitespace", () => {
    expect(parseArray("a, b , c")).toEqual(["a", "b", "c"]);
  });

  it("parses JSON array string", () => {
    expect(parseArray('["x","y"]')).toEqual(["x", "y"]);
  });

  it("falls back to comma split on invalid JSON array", () => {
    expect(parseArray("[not valid json")).toEqual(["[not valid json"]);
  });

  it("passes through an actual array, converting elements to strings", () => {
    expect(parseArray(["a", "b"])).toEqual(["a", "b"]);
  });

  it("converts numeric array elements to strings", () => {
    expect(parseArray([1, 2, 3])).toEqual(["1", "2", "3"]);
  });
});

describe("apiPost", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    initClient("test-api-key");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends POST to eventregistry.org base URL", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: "ok" }),
    });

    await apiPost("/test/path", { foo: "bar" });

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://eventregistry.org/api/v1/test/path",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("injects apiKey into the request body", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await apiPost("/test", { foo: "bar" });

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.apiKey).toBe("test-api-key");
    expect(body.foo).toBe("bar");
  });

  it("strips undefined values from body", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await apiPost("/test", { keep: "yes", drop: undefined });

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.keep).toBe("yes");
    expect(body).not.toHaveProperty("drop");
  });

  it("sets Content-Type to application/json", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await apiPost("/test", {});

    const headers = fetchSpy.mock.calls[0][1].headers;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("throws ApiError on non-2xx response with JSON body", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve('{"error":"bad request"}'),
    });

    await expect(apiPost("/test", {})).rejects.toThrow(ApiError);
    await expect(apiPost("/test", {})).rejects.toMatchObject({
      status: 400,
      body: { error: "bad request" },
    });
  });

  it("throws ApiError with text body on non-JSON error", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Internal Server Error"),
    });

    await expect(apiPost("/test", {})).rejects.toThrow(ApiError);
    await expect(apiPost("/test", {})).rejects.toMatchObject({
      status: 500,
      body: "Internal Server Error",
    });
  });

  it("returns parsed JSON on success", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [1, 2, 3] }),
    });

    const result = await apiPost("/test", {});
    expect(result).toEqual({ results: [1, 2, 3] });
  });
});

describe("analyticsPost", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    initClient("test-api-key");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends POST to analytics.eventregistry.org base URL", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await analyticsPost("/annotate", { text: "hello" });

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://analytics.eventregistry.org/api/v1/annotate",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("injects apiKey into body", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await analyticsPost("/test", { text: "hello" });

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.apiKey).toBe("test-api-key");
    expect(body.text).toBe("hello");
  });
});
