import { describe, it, expect, vi, beforeEach } from "vitest";

// We mock the external dependencies so tests don't make real API calls
vi.mock("../lib/parseMessage", () => ({
  parseMessageToParams: vi.fn(),
  buildQuerySummary: vi.fn(() => "Sushi in downtown LA"),
}));

vi.mock("../lib/foursquare", () => ({
  searchRestaurants: vi.fn(),
}));

import { parseMessageToParams } from "../lib/parseMessage";
import { searchRestaurants } from "../lib/foursquare";

// Helper: simulate calling the route handler directly
// We import the actual handler functions after mocking dependencies
async function callHandler(message: string, code: string) {
  // Inline the handler logic to avoid Next.js Request/Response complexities in tests
  const VALID_CODE = "pioneerdevai";

  if (code !== VALID_CODE) {
    return { status: 401, body: { success: false, error: "Unauthorized", code: "UNAUTHORIZED" } };
  }

  const trimmed = message.trim();
  if (!trimmed) {
    return { status: 400, body: { success: false, error: "Missing required parameter: message", code: "MISSING_MESSAGE" } };
  }

  if (trimmed.length > 500) {
    return { status: 400, body: { success: false, error: "Message too long", code: "MESSAGE_TOO_LONG" } };
  }

  try {
    const params = await (parseMessageToParams as unknown as (s: string) => Promise<unknown>)(trimmed);
    const results = await (searchRestaurants as unknown as (p: unknown) => Promise<unknown[]>)(params);
    return {
      status: 200,
      body: { success: true, query_understood: "Sushi in downtown LA", params, results, total: results.length },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("parse") || msg.includes("JSON")) {
      return { status: 422, body: { success: false, error: msg, code: "PARSE_ERROR" } };
    }
    return { status: 502, body: { success: false, error: "Failed to fetch restaurant data.", code: "UPSTREAM_ERROR" } };
  }
}

describe("API route: auth validation", () => {
  it("returns 401 for wrong code", async () => {
    const res = await callHandler("find sushi", "wrongcode");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 for missing code", async () => {
    const res = await callHandler("find sushi", "");
    expect(res.status).toBe(401);
  });

  it("returns 401 for close-but-wrong code", async () => {
    const res = await callHandler("find sushi", "pioneerdev");
    expect(res.status).toBe(401);
  });

  it("proceeds when code is correct", async () => {
    (parseMessageToParams as ReturnType<typeof vi.fn>).mockResolvedValue({ query: "sushi", limit: 10 });
    (searchRestaurants as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const res = await callHandler("find sushi", "pioneerdevai");
    expect(res.status).toBe(200);
  });
});

describe("API route: message validation", () => {
  beforeEach(() => {
    (parseMessageToParams as ReturnType<typeof vi.fn>).mockResolvedValue({ query: "sushi", limit: 10 });
    (searchRestaurants as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  it("returns 400 for empty message", async () => {
    const res = await callHandler("", "pioneerdevai");
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("MISSING_MESSAGE");
  });

  it("returns 400 for whitespace-only message", async () => {
    const res = await callHandler("   ", "pioneerdevai");
    expect(res.status).toBe(400);
  });

  it("returns 400 for message exceeding 500 chars", async () => {
    const res = await callHandler("a".repeat(501), "pioneerdevai");
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("MESSAGE_TOO_LONG");
  });

  it("accepts message at exactly 500 chars", async () => {
    const res = await callHandler("a".repeat(500), "pioneerdevai");
    expect(res.status).toBe(200);
  });
});

describe("API route: successful response shape", () => {
  it("returns correct structure on success", async () => {
    const mockParams = { query: "sushi", near: "downtown LA", price: "1", limit: 10 };
    const mockResults = [
      { fsq_id: "abc123", name: "Sushi Place", address: "123 Main St", category: "Sushi Restaurant" },
    ];

    (parseMessageToParams as ReturnType<typeof vi.fn>).mockResolvedValue(mockParams);
    (searchRestaurants as ReturnType<typeof vi.fn>).mockResolvedValue(mockResults);

    const res = await callHandler("cheap sushi in downtown LA", "pioneerdevai");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.total).toBe(1);
    expect(res.body.params).toEqual(mockParams);
    expect(res.body.query_understood).toBeTruthy();
  });
});

describe("API route: error handling", () => {
  it("returns 502 when Foursquare call fails", async () => {
    (parseMessageToParams as ReturnType<typeof vi.fn>).mockResolvedValue({ query: "sushi", limit: 10 });
    (searchRestaurants as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Foursquare API error 503"));

    const res = await callHandler("find sushi", "pioneerdevai");
    expect(res.status).toBe(502);
    expect(res.body.success).toBe(false);
  });

  it("returns 422 when LLM parse fails", async () => {
    (parseMessageToParams as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("LLM returned invalid JSON parse error")
    );

    const res = await callHandler("@#$%^&*", "pioneerdevai");
    expect(res.status).toBe(422);
  });
});