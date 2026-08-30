import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiResponse";
import { checkRateLimit } from "@/lib/rateLimit";
import { suggestProfessions, suggestFormations, type Suggestion } from "@/lib/search/suggest";

const REQUEST_TIMEOUT_MS = 3000;

async function suggestCities(query: string): Promise<Suggestion[]> {
  if (query.trim().length < 2) return [];
  const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
    query
  )}&type=municipality&autocomplete=1&limit=6`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return [];
    const data = await res.json();
    const features: unknown[] = Array.isArray(data?.features) ? data.features : [];
    return features.map((f) => {
      const feature = f as {
        properties: { label: string; city: string; postcode: string };
        geometry: { coordinates: [number, number] };
      };
      const [longitude, latitude] = feature.geometry.coordinates;
      return {
        type: "city" as const,
        label: feature.properties.label,
        value: feature.properties.city,
        meta: feature.properties.postcode,
        latitude,
        longitude,
      };
    });
  } catch {
    // A slow/unreachable BAN API must never break the search experience —
    // city suggestions just come back empty, professions/formations still work.
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const rl = checkRateLimit(`search-suggest:${userId}`, { limit: 60, windowMs: 60 * 1000 });
    if (!rl.ok) return NextResponse.json({ cities: [], professions: [], formations: [] });

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    if (q.length < 2) {
      return NextResponse.json({ cities: [], professions: [], formations: [] });
    }

    const [cities, professions, formations] = await Promise.all([
      suggestCities(q),
      Promise.resolve(suggestProfessions(q)),
      Promise.resolve(suggestFormations(q)),
    ]);

    return NextResponse.json({ cities, professions, formations });
  } catch (err) {
    return handleApiError(err);
  }
}
