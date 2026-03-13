import { NextRequest, NextResponse } from "next/server";
import { parseMessageToParams, buildQuerySummary } from "@/lib/parseMessage";
import { searchRestaurants } from "@/lib/foursquare";
import type { ApiResponse } from "@/lib/types";

// GET /api/execute?message=<query>&code=pioneerdevai
// This is the ONLY endpoint — both the UI and external callers use this same route.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const message = searchParams.get("message") ?? "";
  const code = searchParams.get("code") ?? "";
  return handleRequest(message, code);
}

async function handleRequest(message: string, code: string): Promise<NextResponse<ApiResponse>> {
  // ── 1. Auth gate ─────────────────────────────────────────────────────────
  if (code !== "pioneerdevai") {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Invalid or missing code.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  // ── 2. Input validation ───────────────────────────────────────────────────
  const trimmed = message.trim();
  if (!trimmed) {
    return NextResponse.json(
      { success: false, error: "Missing required parameter: message", code: "MISSING_MESSAGE" },
      { status: 400 }
    );
  }

  if (trimmed.length > 500) {
    return NextResponse.json(
      { success: false, error: "Message too long (max 500 characters)", code: "MESSAGE_TOO_LONG" },
      { status: 400 }
    );
  }

  // ── 3. Parse natural language → structured params ─────────────────────────
  let params;
  try {
    params = await parseMessageToParams(trimmed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to parse your request";
    return NextResponse.json(
      { success: false, error: `Could not understand request: ${msg}`, code: "PARSE_ERROR" },
      { status: 422 }
    );
  }

  // ── 4. Call Foursquare ────────────────────────────────────────────────────
  let results;
  try {
    results = await searchRestaurants(params);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    // Log server-side but return a safe message to client
    console.error("[foursquare error]", msg);
    return NextResponse.json(
      { success: false, error: "Failed to fetch restaurant data. Please try again.", code: "UPSTREAM_ERROR" },
      { status: 502 }
    );
  }

  // ── 5. Return clean response ──────────────────────────────────────────────
  return NextResponse.json({
    success: true,
    query_understood: buildQuerySummary(params),
    params,
    results,
    total: results.length,
  });
}