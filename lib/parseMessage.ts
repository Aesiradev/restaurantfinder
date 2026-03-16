import Anthropic from "@anthropic-ai/sdk";
import type { SearchParams } from "./types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Instructs Claude to extract only what the user explicitly mentioned.
// Few-shot examples are included to keep output consistent and JSON-only.
const SYSTEM_PROMPT = `You are a restaurant search parameter extractor. 
Given a natural language restaurant query, extract structured search parameters.

Return ONLY a valid JSON object with these optional fields:
- query (string): the food/cuisine type, e.g. "sushi", "tacos", "burger". Required.
- near (string): location the user mentioned, e.g. "downtown Los Angeles". Include if mentioned.
- price (string): "1" = cheap/inexpensive, "2" = moderate, "3" = expensive, "4" = very expensive. Include ONLY if user mentions price level.
- open_now (boolean): true ONLY if user says "open now" or "currently open". Otherwise omit.
- sort ("RELEVANCE"|"RATING"|"DISTANCE"): "RATING" if user wants best/top-rated, "DISTANCE" if user wants nearby/closest, otherwise "RELEVANCE".
- min_rating (number): 0-10 scale. Include ONLY if user mentions "good reviews", "highly rated", "4+ stars" etc. Map 4 stars → 8.0, 3.5 stars → 7.0, "good" → 7.5.
- limit (number): default 10, max 20.

Rules:
- query is REQUIRED. If unclear, use "restaurant".
- Do NOT invent constraints the user didn't mention.
- Return ONLY the JSON object, no explanation, no markdown fences.

Examples:
User: "cheap sushi in downtown LA open now"
{"query":"sushi","near":"downtown Los Angeles","price":"1","open_now":true,"sort":"RELEVANCE","limit":10}

User: "best rated Italian restaurants near me"
{"query":"Italian","sort":"RATING","min_rating":8.0,"limit":10}

User: "pizza"
{"query":"pizza","sort":"RELEVANCE","limit":10}`;

// Sends the user message to Claude and returns validated search params
export async function parseMessageToParams(message: string): Promise<SearchParams> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: message }],
  });

  const raw = response.content[0];
  if (raw.type !== "text") {
    throw new Error("Unexpected response type from LLM");
  }

  // Strip markdown fences in case the model wraps the JSON anyway
  const text = raw.text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`LLM returned invalid JSON: ${text}`);
  }

  return validateAndCleanParams(parsed);
}

// Validates every field from the LLM before it reaches Foursquare.
// Unknown or malformed fields are dropped — never passed downstream.
export function validateAndCleanParams(raw: unknown): SearchParams {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Params must be a non-null object");
  }

  const p = raw as Record<string, unknown>;

  if (typeof p.query !== "string" || p.query.trim() === "") {
    throw new Error('Missing required field: "query"');
  }

  const params: SearchParams = {
    query: p.query.trim().slice(0, 100),
  };

  if (typeof p.near === "string" && p.near.trim()) {
    params.near = p.near.trim().slice(0, 200);
  }

  // ll must be a valid lat,lng coordinate string
  if (typeof p.ll === "string" && /^-?\d+\.?\d*,-?\d+\.?\d*$/.test(p.ll)) {
    params.ll = p.ll;
  }

  if (typeof p.price === "string" && ["1", "2", "3", "4"].includes(p.price)) {
    params.price = p.price;
  }

  if (typeof p.open_now === "boolean") {
    params.open_now = p.open_now;
  }

  const validSorts = ["RELEVANCE", "RATING", "DISTANCE"];
  if (typeof p.sort === "string" && validSorts.includes(p.sort)) {
    params.sort = p.sort as SearchParams["sort"];
  }

  if (typeof p.min_rating === "number" && p.min_rating >= 0 && p.min_rating <= 10) {
    params.min_rating = p.min_rating;
  }

  // Clamp limit to 1–20 and ensure it's an integer
  const limitRaw = typeof p.limit === "number" ? p.limit : 10;
  params.limit = Math.min(Math.max(1, Math.floor(limitRaw)), 20);

  return params;
}

// Builds a human-readable summary of what was searched, shown below the results header
export function buildQuerySummary(params: SearchParams): string {
  const parts: string[] = [];

  if (params.price) {
    const priceLabels: Record<string, string> = {
      "1": "budget",
      "2": "mid-range",
      "3": "upscale",
      "4": "fine dining",
    };
    parts.push(priceLabels[params.price] ?? "");
  }

  parts.push(params.query);

  if (params.near) parts.push(`in ${params.near}`);
  if (params.open_now) parts.push("open now");
  if (params.min_rating) parts.push(`rated ${params.min_rating}+`);

  const base = parts.filter(Boolean).join(" ");
  return base.charAt(0).toUpperCase() + base.slice(1);
}