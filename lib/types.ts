export interface SearchParams {
  query: string;
  near?: string;
  ll?: string;
  price?: string;
  open_now?: boolean;
  limit?: number;
  sort?: "RELEVANCE" | "RATING" | "DISTANCE";
  min_rating?: number;
}

export interface Restaurant {
  fsq_id: string;
  name: string;
  address: string;
  neighborhood?: string;
  category: string;
  price?: number;
  rating?: number;
  distance?: number;
  hours_display?: string;
  is_open?: boolean;
  phone?: string;
  website?: string;
  photo_url?: string;
  tips_count?: number;
  foursquare_url?: string;
}

export interface ApiSuccessResponse {
  success: true;
  query_understood: string;
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

export interface FoursquarePlace {
  fsq_id: string;
  fsq_place_id?: string;
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
    open_now?: boolean;
  };
  closed_bucket?: string;
  tel?: string;
  website?: string;
  photos?: Array<{ prefix: string; suffix: string; width: number; height: number }>;
  stats?: { total_tips?: number };
}