import type { SearchParams, Restaurant, FoursquarePlace } from "./types";

const FSQ_BASE = "https://places-api.foursquare.com/places";
const FSQ_API_KEY = process.env.FOURSQUARE_API_KEY!;

export async function searchRestaurants(params: SearchParams): Promise<Restaurant[]> {
  const url = buildFoursquareUrl(params);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${FSQ_API_KEY}`,
      Accept: "application/json",
      "X-Places-Api-Version": "2025-06-17",
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Foursquare API error ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as { results: FoursquarePlace[] };
  const places = data.results ?? [];

  const restaurants = places.map(transformPlace);

  if (params.min_rating != null) {
    return restaurants.filter(
      (r) => r.rating == null || r.rating >= params.min_rating!
    );
  }

  return restaurants;
}

function buildFoursquareUrl(params: SearchParams): string {
  const query = new URLSearchParams();

  query.set("query", params.query);
  query.set("limit", String(params.limit ?? 10));

  if (params.near) {
    query.set("near", params.near);
  } else if (params.ll) {
    query.set("ll", params.ll);
  }

  if (params.price) {
    query.set("price", params.price);
  }

  if (params.open_now) {
    query.set("open_now", "true");
  }

  if (params.sort) {
    query.set("sort", params.sort);
  }

  return `${FSQ_BASE}/search?${query.toString()}`;
}

function transformPlace(place: FoursquarePlace): Restaurant {
  const address =
    place.location?.formatted_address ??
    place.location?.address ??
    "Address unavailable";

  const neighborhood = place.location?.neighborhood?.[0];
  const category = place.categories?.[0]?.name ?? "Restaurant";

  let photo_url: string | undefined;
  if (place.photos?.[0]) {
    const p = place.photos[0];
    photo_url = `${p.prefix}400x300${p.suffix}`;
  }

  const fsq_id = place.fsq_place_id ?? place.fsq_id;

  return {
    fsq_id,
    name: place.name,
    address,
    neighborhood,
    category,
    price: place.price,
    rating: place.rating,
    distance: place.distance,
    hours_display: place.hours?.display,
    is_open: place.hours?.open_now,
    phone: place.tel,
    website: place.website,
    photo_url,
    tips_count: place.stats?.total_tips,
    foursquare_url: `https://foursquare.com/v/${fsq_id}`,
  };
}