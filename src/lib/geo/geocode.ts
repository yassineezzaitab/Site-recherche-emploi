import { prisma } from "@/lib/prisma";

/**
 * Geocoding: turns a free-text French address/city into coordinates.
 *
 * Uses the "Base Adresse Nationale" (BAN) API — a free, public, keyless
 * French government API (https://api-adresse.data.gouv.fr) — so no
 * geocoding API key is required to run this feature.
 *
 * Resilience, so a flaky or unreachable network never breaks the app:
 *  - Every lookup is cached in the GeocodeCache table by normalized query,
 *    including failed lookups (so a bad/unrecognized address doesn't get
 *    retried against the API on every save — see CACHE_MISS_RETRY_AFTER_MS).
 *  - One retry with a short backoff on a transient failure (timeout,
 *    network error, non-2xx) before giving up.
 *  - A per-request timeout (4s) so a hanging request never blocks a save.
 *  - On total failure, returns null — never throws. Callers MUST treat a
 *    null result as "distance filtering unavailable for this record," not
 *    as an error: the matching engine already renders a neutral score and
 *    an explicit "localisation approximative" explanation in that case
 *    (see scoreLocation in src/lib/matching/engine.ts), and the profile UI
 *    surfaces a note when a city couldn't be resolved (see ProfilePage).
 */

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  label: string;
}

const CACHE_MISS_RETRY_AFTER_MS = 24 * 60 * 60 * 1000; // retry a failed lookup at most once/day
const REQUEST_TIMEOUT_MS = 4000;

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function queryBan(query: string): Promise<GeocodeResult | null> {
  const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=1`;

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchWithTimeout(url);
      if (!res.ok) {
        lastError = new Error(`BAN API returned ${res.status}`);
        continue;
      }
      const data = await res.json();
      const feature = data?.features?.[0];
      if (!feature) return null; // valid response, just no match — not worth retrying
      const [longitude, latitude] = feature.geometry.coordinates;
      return { latitude, longitude, label: feature.properties.label };
    } catch (err) {
      lastError = err;
      if (attempt === 0) await new Promise((r) => setTimeout(r, 400)); // brief backoff before retry
    }
  }
  if (lastError) {
    console.warn("[geocode] BAN API lookup failed after retry:", lastError);
  }
  return null;
}

export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  if (!query?.trim()) return null;
  const provider = (process.env.GEOCODING_PROVIDER || "ban").trim();
  if (provider !== "ban") return null;

  const normalized = normalizeQuery(query);

  const cached = await prisma.geocodeCache.findUnique({ where: { query: normalized } }).catch(() => null);
  if (cached) {
    const isStaleFailure =
      !cached.found && Date.now() - cached.lookedUpAt.getTime() > CACHE_MISS_RETRY_AFTER_MS;
    if (!isStaleFailure) {
      return cached.found && cached.latitude != null && cached.longitude != null
        ? { latitude: cached.latitude, longitude: cached.longitude, label: cached.label ?? query }
        : null;
    }
  }

  const result = await queryBan(query);

  await prisma.geocodeCache
    .upsert({
      where: { query: normalized },
      update: {
        found: !!result,
        latitude: result?.latitude,
        longitude: result?.longitude,
        label: result?.label,
        lookedUpAt: new Date(),
      },
      create: {
        query: normalized,
        found: !!result,
        latitude: result?.latitude,
        longitude: result?.longitude,
        label: result?.label,
      },
    })
    .catch((err) => console.warn("[geocode] failed to write cache entry:", err));

  return result;
}
