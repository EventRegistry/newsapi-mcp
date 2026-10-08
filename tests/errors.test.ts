import { describe, it, expect } from "vitest";
import { ApiError, classifyError } from "../src/types.js";
import { formatErrorResponse, formatUnknownError } from "../src/errors.js";
import { validateFieldGroups } from "../src/response-filter.js";
import { withAccessToken } from "../src/client.js";

// ---------- classifyError ----------

describe("classifyError", () => {
  it("classifies 401 as auth_error", () => {
    expect(classifyError(401)).toBe("auth_error");
  });

  it("classifies 403 as auth_error", () => {
    expect(classifyError(403)).toBe("auth_error");
  });

  it("classifies 429 as rate_limit", () => {
    expect(classifyError(429)).toBe("rate_limit");
  });

  it("classifies 400 as invalid_param", () => {
    expect(classifyError(400)).toBe("invalid_param");
  });

  it("classifies 404 as not_found", () => {
    expect(classifyError(404)).toBe("not_found");
  });

  it("classifies 500 as api_error", () => {
    expect(classifyError(500)).toBe("api_error");
  });

  it("classifies 503 as concurrent_limit", () => {
    expect(classifyError(503)).toBe("concurrent_limit");
  });

  it("classifies unknown status as api_error", () => {
    expect(classifyError(418)).toBe("api_error");
  });
});

// ---------- ApiError ----------

describe("ApiError", () => {
  it("sets category and isRetryable for 429", () => {
    const err = new ApiError(429, "too many requests");
    expect(err.category).toBe("rate_limit");
    expect(err.isRetryable).toBe(true);
  });

  it("sets category and isRetryable for 500", () => {
    const err = new ApiError(500, "internal error");
    expect(err.category).toBe("api_error");
    expect(err.isRetryable).toBe(true);
  });

  it("sets category and isRetryable for 503", () => {
    const err = new ApiError(503, "too many concurrent requests");
    expect(err.category).toBe("concurrent_limit");
    expect(err.isRetryable).toBe(true);
  });

  it("sets not retryable for 401", () => {
    const err = new ApiError(401, "unauthorized");
    expect(err.category).toBe("auth_error");
    expect(err.isRetryable).toBe(false);
  });

  it("sets not retryable for 400", () => {
    const err = new ApiError(400, { error: "bad param" });
    expect(err.category).toBe("invalid_param");
    expect(err.isRetryable).toBe(false);
  });

  it("preserves status and body", () => {
    const body = { error: "test" };
    const err = new ApiError(403, body);
    expect(err.status).toBe(403);
    expect(err.body).toBe(body);
  });
});

// ---------- formatErrorResponse: hosted server login ----------

describe("formatErrorResponse with an access token", () => {
  const unlinked = new ApiError(401, {
    error: "invalid_token",
    error_description: "No Event Registry account is linked to this login",
  });

  it("tells the user to sign in at eventregistry.org when no account is linked", () => {
    const msg = withAccessToken("tok", () => formatErrorResponse(unlinked));
    expect(msg).toContain("https://eventregistry.org");
    expect(msg).toContain("retry");
    expect(msg).not.toContain("NEWSAPI_KEY");
  });

  it("tells the user the login expired on a plain 401", () => {
    const msg = withAccessToken("tok", () =>
      formatErrorResponse(new ApiError(401, "unauthorized")),
    );
    expect(msg).toContain("login has expired");
    expect(msg).toContain("reconnect");
    expect(msg).not.toContain("NEWSAPI_KEY");
  });

  it("does not ask to reconnect on a 403", () => {
    const msg = withAccessToken("tok", () =>
      formatErrorResponse(new ApiError(403, "forbidden")),
    );
    expect(msg).toContain("not allowed");
    expect(msg).not.toContain("reconnect");
    expect(msg).not.toContain("NEWSAPI_KEY");
  });

  it("includes the API's reason in the 403 message", () => {
    const err = new ApiError(403, {
      error: "insufficient_scope",
      error_description: "Token lacks the required scope",
    });
    const msg = withAccessToken("tok", () => formatErrorResponse(err));
    expect(msg).toContain("insufficient_scope: Token lacks the required scope");
  });

  it("includes a plain-text 403 reason as is", () => {
    const msg = withAccessToken("tok", () =>
      formatErrorResponse(new ApiError(403, "plan does not allow this")),
    );
    expect(msg).toContain("plan does not allow this");
  });

  it("keeps the API key guidance outside a token context", () => {
    expect(formatErrorResponse(new ApiError(401, "unauthorized"))).toContain(
      "NEWSAPI_KEY",
    );
  });
});

// ---------- formatErrorResponse ----------

describe("formatErrorResponse", () => {
  it("returns rate limit guidance for 429", () => {
    const err = new ApiError(429, "quota exceeded");
    const msg = formatErrorResponse(err);
    expect(msg).toContain("Rate limited");
    expect(msg).toContain("next day");
    expect(msg).not.toContain("retryable");
  });

  it("returns auth guidance for 401", () => {
    const err = new ApiError(401, "unauthorized");
    const msg = formatErrorResponse(err);
    expect(msg).toContain("Authentication failed");
    expect(msg).toContain("NEWSAPI_KEY");
  });

  it("returns not_found guidance for 404", () => {
    const err = new ApiError(404, "not found");
    const msg = formatErrorResponse(err);
    expect(msg).toContain("No results found");
    expect(msg).toContain("broader search");
  });

  it("returns concurrent limit guidance for 503", () => {
    const err = new ApiError(503, "too many concurrent requests");
    const msg = formatErrorResponse(err);
    expect(msg).toContain("simultaneous requests");
    expect(msg).toContain("max 5 concurrent");
    expect(msg).toContain("sequentially");
  });

  it("returns server error guidance for 500 with retryable hint", () => {
    const err = new ApiError(500, "internal error");
    const msg = formatErrorResponse(err);
    expect(msg).toContain("Server error");
    expect(msg).toContain("retryable");
  });

  it("includes API error body for 400", () => {
    const err = new ApiError(400, { error: "invalid lang parameter" });
    const msg = formatErrorResponse(err);
    expect(msg).toContain("Invalid request");
    expect(msg).toContain("invalid lang parameter");
  });

  it("suggests valid lang values when lang mentioned in error body", () => {
    const err = new ApiError(400, "invalid value for lang");
    const msg = formatErrorResponse(err);
    expect(msg).toContain('Valid values for "lang"');
    expect(msg).toContain("eng");
    expect(msg).toContain("deu");
  });

  it("suggests valid articlesSortBy values when mentioned in error body", () => {
    const err = new ApiError(400, {
      error: "invalid articlesSortBy value",
    });
    const msg = formatErrorResponse(err);
    expect(msg).toContain('Valid values for "articlesSortBy"');
    expect(msg).toContain("date");
    expect(msg).toContain("rel");
  });

  it("handles string error body for 400", () => {
    const err = new ApiError(400, "bad request");
    const msg = formatErrorResponse(err);
    expect(msg).toContain("Invalid request");
    expect(msg).toContain("bad request");
  });

  it("handles null error body for 400", () => {
    const err = new ApiError(400, null);
    const msg = formatErrorResponse(err);
    expect(msg).toContain("Invalid request");
  });
});

// ---------- formatUnknownError ----------

describe("formatUnknownError", () => {
  it("formats Error instances", () => {
    const msg = formatUnknownError(new Error("connection refused"));
    expect(msg).toContain("Network/unexpected error");
    expect(msg).toContain("connection refused");
  });

  it("formats non-Error values", () => {
    const msg = formatUnknownError("something went wrong");
    expect(msg).toContain("Unexpected error");
    expect(msg).toContain("something went wrong");
  });
});

// ---------- validateFieldGroups ----------

describe("validateFieldGroups", () => {
  it("returns empty array for undefined", () => {
    expect(validateFieldGroups(undefined)).toEqual([]);
  });

  it("returns empty array for valid groups", () => {
    expect(validateFieldGroups("sentiment,concepts")).toEqual([]);
  });

  it("returns warning for unknown group", () => {
    const warnings = validateFieldGroups("sentiment,bogus,concepts");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("bogus");
    expect(warnings[0]).toContain("ignored");
    expect(warnings[0]).toContain("Valid:");
  });

  it("returns multiple warnings for multiple unknown groups", () => {
    const warnings = validateFieldGroups("foo,bar");
    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toContain("foo");
    expect(warnings[1]).toContain("bar");
  });

  it("returns empty array for empty string", () => {
    expect(validateFieldGroups("")).toEqual([]);
  });
});
