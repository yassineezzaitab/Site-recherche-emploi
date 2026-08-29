/**
 * Geocoding: turns a free-text French address/city into coordinates.
 *
 * Uses the "Base Adresse Nationale" (BAN) API — a free, public, keyless
 * French government API (https://api-adresse.data.gouv.fr) — so no
 * geocoding API key is required to run this feature. If the request fails
 * (offline dev environment, network policy, rate limit) we fail soft and
 * return null; callers must treat missing coordinates as "distance
 * filtering unavailable for this record" rather than an error.
 */

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  label: string;
}

export async function geocodeAddress(
  query: string
): Promise<GeocodeResult | null> {
  if (!query?.trim()) return null;
  const provider = process.env.GEOCODING_PROVIDER || "ban";
  if (provider !== "ban") return null;

  try {
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
      query
    )}&limit=1`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    const feature = data?.features?.[0];
    if (!feature) return null;
    const [longitude, latitude] = feature.geometry.coordinates;
    return { latitude, longitude, label: feature.properties.label };
  } catch {
    return null;
  }
}
