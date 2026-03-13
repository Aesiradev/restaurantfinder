// ─── Search Parameters ────────────────────────────────────────────────────────
// This is what the LLM extracts from the user's natural language message.
// We validate this shape before ever calling Foursquare.
export interface SearchParams {
  query: string; // e.g. "sushi", "tacos", "pizza"
  near?: string; // e.g. "downtown Los Angeles"
  ll?: string; // lat,lng alternative to `near`
  price?: string; // "1" = cheap, "2" = moderate, "3" = expensive, "4" = very expensive
  open_now?: boolean;
  limit?: number; // max results, default 10
  sort?: "RELEVANCE" | "RATING" | "DISTANCE"; // Foursquare sort options
  min_rating?: number; // 0–10 Foursquare rating scale
}

// ─── Restaurant Result ────────────────────────────────────────────────────────
// Cleaned, UI-ready shape. We never expose raw Foursquare blobs to the frontend.
export interface Restaurant {
  fsq_id: string;
  name: string;
  address: string;
  neighborhood?: string;
  category: string;
  price?: number; // 1–4
  rating?: number; // 0–10
  distance?: number; // meters from search center
  hours_display?: string; // e.g. "Open now · Closes 11 PM"
  is_open?: boolean;
  phone?: string;
  website?: string;
  photo_url?: string;
  tips_count?: number;
  foursquare_url?: string; // e.g. https://foursquare.com/v/fsq_id
}

// ─── API Response ─────────────────────────────────────────────────────────────
export interface ApiSuccessResponse {
  success: true;
  query_understood: string; // Human-readable summary of what we searched for
  params: SearchParams;
  results: Restaurant[];
  total: number;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
}

export type ApiResponse = ApiSuccessResponse | ApiErrorResponse;

// ─── Foursquare Raw Types ─────────────────────────────────────────────────────
// These represent what Foursquare actually returns. We only type what we use.
export interface FoursquarePlace {
  fsq_id: string;
  fsq_place_id?: string; // Places API v3 returns this instead of fsq_id
  name: string;
  location?: {
    address?: string;
    formatted_address?: string;
    neighborhood?: string[];
  };
  categories?: Array<{ name: string; icon?: { prefix: string; suffix: string } }>;
  price?: number;
  rating?: number;
  distance?: number;
  hours?: {
    display?: string;
    is_local_holiday?: boolean;
    open_now?: boolean;
  };
  tel?: string;
  website?: string;
  photos?: Array<{ prefix: string; suffix: string; width: number; height: number }>;
  stats?: { total_tips?: number };
}