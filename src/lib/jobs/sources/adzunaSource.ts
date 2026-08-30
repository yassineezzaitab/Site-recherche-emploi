import type { JobSourceAdapter, NormalizedJob } from "./types";

/**
 * Adzuna Jobs API adapter (France).
 *
 * A real, free-tier, official job search API (https://developer.adzuna.com)
 * covering ~20 countries including France. Registration is instant and
 * free: sign up at https://developer.adzuna.com, confirm your email, and
 * your App ID + App Key appear on your dashboard immediately — no approval
 * wait, unlike some job-board partner programs. Set ADZUNA_APP_ID and
 * ADZUNA_APP_KEY to enable this source.
 *
 * HONESTY NOTE: this sandbox has no outbound network access to
 * developer.adzuna.com or api.adzuna.com (confirmed via direct test — the
 * environment's egress proxy rejects the connection), so this adapter has
 * not been exercised against the live API. The endpoint shape and response
 * field names below (`salary_min`, `salary_max`, `redirect_url`,
 * `company.display_name`, `location.display_name`, `contract_type`,
 * `latitude`/`longitude`) come from Adzuna's public documentation and
 * multiple independent third-party integration write-ups retrieved via web
 * search, and are a stable, long-documented public API shape — but treat
 * this the same as the France Travail adapter: verify with a real key
 * before trusting it blindly in production, via `npm run refresh:jobs`.
 */

const SEARCH_URL = "https://api.adzuna.com/v1/api/jobs/fr/search/1";

export interface AdzunaResult {
  id?: string;
  title?: string;
  description?: string;
  company?: { display_name?: string };
  location?: { display_name?: string; area?: string[] };
  salary_min?: number;
  salary_max?: number;
  contract_type?: string; // "permanent" | "contract"
  contract_time?: string; // "full_time" | "part_time"
  category?: { label?: string };
  created?: string;
  redirect_url?: string;
  latitude?: number;
  longitude?: number;
}

function mapContractType(result: AdzunaResult): NormalizedJob["contractType"] {
  if (result.contract_type === "permanent") return "CDI";
  if (result.contract_type === "contract") return "CDD";
  return "CDD";
}

export function mapOffer(result: AdzunaResult): NormalizedJob | null {
  if (!result.id || !result.title) return null;

  const cityGuess = result.location?.area?.slice(-1)?.[0] ?? result.location?.display_name;

  return {
    externalId: String(result.id),
    title: result.title,
    companyName: result.company?.display_name || "Entreprise non précisée",
    description: result.description || "",
    city: cityGuess,
    country: "FR",
    latitude: result.latitude,
    longitude: result.longitude,
    contractType: mapContractType(result),
    experienceLevel: "ANY",
    salaryMin: result.salary_min ? Math.round(result.salary_min / 12) : undefined,
    salaryMax: result.salary_max ? Math.round(result.salary_max / 12) : undefined,
    salaryPeriod: result.salary_min || result.salary_max ? "MONTH" : undefined,
    hoursPerWeek: result.contract_time === "part_time" ? undefined : 35,
    remoteType: "ONSITE_ONLY",
    requiredSkills: result.category?.label ? [result.category.label] : [],
    url: result.redirect_url || "",
    publishedAt: result.created || new Date().toISOString(),
  };
}

export const adzunaSource: JobSourceAdapter = {
  key: "adzuna",
  name: "Adzuna",
  kind: "PUBLIC_API",
  isConfigured() {
    return Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);
  },
  async fetchJobs() {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;
    if (!appId || !appKey) return [];

    const params = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      results_per_page: "50",
      "content-type": "application/json",
    });

    const res = await fetch(`${SEARCH_URL}?${params.toString()}`);
    if (!res.ok) {
      // Throw rather than return [] so a failed sync is recorded as such
      // (JobSource.lastSyncOk = false) instead of looking identical to "0
      // jobs matched right now".
      throw new Error(`search request failed with status ${res.status}`);
    }
    const data = await res.json();
    const results: AdzunaResult[] = data.results ?? [];
    return results.map(mapOffer).filter((j): j is NormalizedJob => j !== null);
  },
};
