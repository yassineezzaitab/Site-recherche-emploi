import type { JobSourceAdapter, NormalizedJob } from "./types";

/**
 * RemoteOK public API adapter — remote jobs.
 *
 * RemoteOK explicitly publishes a free, keyless JSON feed at
 * https://remoteok.com/api specifically for third-party reuse (documented
 * in their own help center) — no registration, no terms-of-service
 * violation, no scraping involved. Because every listing here is remote by
 * definition, it complements France Travail/Adzuna (which skew local/
 * on-site) rather than duplicating them. Unlike the other two real
 * adapters, this one needs **no environment variables at all** — it's
 * always `isConfigured() === true`, so once APP_MODE=production is set,
 * this source activates automatically with zero setup.
 *
 * HONESTY NOTE: this sandbox has no outbound network access to
 * remoteok.com (confirmed via direct test), so this adapter has not been
 * exercised live either. The response shape is well-documented and has
 * been stable for years (a leading `{"legal": ...}` notice element
 * followed by job objects) — this is corroborated by multiple independent
 * third-party integrations retrieved via web search — but as with the
 * other real sources, verify once with real network access before
 * production use.
 */

const API_URL = "https://remoteok.com/api";

export interface RemoteOkResult {
  id?: string | number;
  slug?: string;
  position?: string;
  company?: string;
  description?: string;
  location?: string;
  tags?: string[];
  salary_min?: number;
  salary_max?: number;
  date?: string;
  url?: string;
  apply_url?: string;
}

export function mapOffer(result: RemoteOkResult): NormalizedJob | null {
  const id = result.id ?? result.slug;
  if (!id || !result.position || !result.company) return null;

  return {
    externalId: String(id),
    title: result.position,
    companyName: result.company,
    description: result.description || "",
    city: result.location && result.location.toLowerCase() !== "worldwide" ? result.location : undefined,
    country: "FR", // RemoteOK jobs are remote-first; country is not meaningful, default kept for schema consistency
    contractType: "CDI",
    experienceLevel: "ANY",
    salaryMin: result.salary_min ? Math.round(result.salary_min / 12) : undefined,
    salaryMax: result.salary_max ? Math.round(result.salary_max / 12) : undefined,
    salaryPeriod: result.salary_min || result.salary_max ? "MONTH" : undefined,
    remoteType: "REMOTE_ONLY",
    requiredSkills: result.tags ?? [],
    url: result.apply_url || result.url || `https://remoteok.com/remote-jobs/${id}`,
    publishedAt: result.date || new Date().toISOString(),
  };
}

export const remoteOkSource: JobSourceAdapter = {
  key: "remoteok",
  name: "RemoteOK",
  kind: "PUBLIC_API",
  isConfigured() {
    return true;
  },
  async fetchJobs() {
    const res = await fetch(API_URL, {
      headers: { "User-Agent": "JobMatch/1.0 (+https://github.com)" },
    });
    if (!res.ok) {
      // Throw rather than return [] so the ingest pipeline records this as
      // a failed sync (JobSource.lastSyncOk = false) instead of silently
      // looking like "0 jobs matched right now" — those are very different
      // operational states and only one of them needs attention.
      throw new Error(`request failed with status ${res.status}`);
    }
    const data = (await res.json()) as RemoteOkResult[];
    // The first array element is a legal/notice object, not a job — skip it.
    const results = Array.isArray(data) ? data.slice(1) : [];
    return results.map(mapOffer).filter((j): j is NormalizedJob => j !== null);
  },
};
