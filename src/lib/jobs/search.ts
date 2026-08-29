import { prisma } from "@/lib/prisma";
import type { Job } from "@prisma/client";
import { parseNaturalLanguageQuery, type ParsedQuery } from "@/lib/nlp/parseQuery";
import { computeMatch } from "@/lib/matching/engine";
import { toMatchJobInput } from "@/lib/matching/mappers";
import type { MatchProfileInput, MatchResult } from "@/lib/matching/types";
import { cosineSimilarity } from "@/lib/matching/textSimilarity";
import { haversineKm } from "@/lib/geo/distance";

export interface SearchFilters {
  q?: string;
  contractTypes?: string[];
  remote?: ("ONSITE_ONLY" | "HYBRID" | "REMOTE_ONLY")[];
  minSalaryMonthly?: number;
  maxDistanceKm?: number;
  experienceLevel?: string;
  hoursMax?: number;
  sort?: "match" | "date" | "salary";
  page?: number;
  pageSize?: number;
}

export interface SearchResultItem {
  job: Job;
  match: MatchResult | null;
}

export interface SearchOutcome {
  items: SearchResultItem[];
  total: number;
  page: number;
  pageSize: number;
  parsedQuery: ParsedQuery | null;
}

/**
 * Executes a job search: applies natural-language + structured filters,
 * then (if the user has a profile) scores and sorts by match quality.
 *
 * Filtering is done in application code over the set of active jobs rather
 * than as a giant SQL WHERE clause. At demo scale (dozens to low
 * thousands of rows) this is simpler and just as fast; a production
 * deployment ingesting tens of thousands of real listings should move
 * this to a proper search index (Postgres full-text / Meilisearch /
 * OpenSearch) — the SearchFilters shape here is designed to translate
 * directly into that kind of query later without changing call sites.
 */
export async function searchJobs(
  filters: SearchFilters,
  profileInput: MatchProfileInput | null
): Promise<SearchOutcome> {
  const parsedQuery = filters.q?.trim() ? parseNaturalLanguageQuery(filters.q) : null;

  const contractTypes = filters.contractTypes?.length
    ? filters.contractTypes
    : parsedQuery?.contractTypes?.length
      ? parsedQuery.contractTypes
      : undefined;

  const minSalaryMonthly = filters.minSalaryMonthly ?? parsedQuery?.minSalaryMonthly ?? undefined;
  const maxDistanceKm = filters.maxDistanceKm ?? parsedQuery?.maxDistanceKm ?? undefined;
  const hoursMax = filters.hoursMax ?? parsedQuery?.hoursPerWeekMax ?? undefined;
  const experienceLevel = filters.experienceLevel ?? parsedQuery?.experienceLevel ?? undefined;
  const remote =
    filters.remote?.length
      ? filters.remote
      : parsedQuery?.remotePreference
        ? [parsedQuery.remotePreference]
        : undefined;

  const candidates = await prisma.job.findMany({
    where: {
      isActive: true,
      duplicateOfId: null,
      ...(contractTypes ? { contractType: { in: contractTypes as never[] } } : {}),
      ...(remote ? { remoteType: { in: remote as never[] } } : {}),
      ...(experienceLevel && experienceLevel !== "ANY"
        ? { experienceLevel: { in: [experienceLevel as never, "ANY" as never] } }
        : {}),
    },
    orderBy: { publishedAt: "desc" },
    take: 500,
  });

  let filtered = candidates;

  if (minSalaryMonthly) {
    filtered = filtered.filter((j) => {
      const normalized = normalizeMonthly(j.salaryMax ?? j.salaryMin, j.salaryPeriod);
      return normalized == null || normalized >= minSalaryMonthly * 0.85; // soft threshold, keep near-misses visible
    });
  }

  if (hoursMax) {
    filtered = filtered.filter((j) => !j.hoursPerWeek || j.hoursPerWeek <= hoursMax + 5);
  }

  const originLat = profileInput?.latitude ?? undefined;
  const originLng = profileInput?.longitude ?? undefined;
  const effectiveMaxDistance = maxDistanceKm ?? profileInput?.maxDistanceKm ?? undefined;
  if (effectiveMaxDistance && originLat != null && originLng != null) {
    filtered = filtered.filter((j) => {
      if (j.remoteType === "REMOTE_ONLY") return true;
      if (j.latitude == null || j.longitude == null) return true; // keep unknown-location jobs visible
      return haversineKm(originLat, originLng, j.latitude, j.longitude) <= effectiveMaxDistance * 1.5;
    });
  }

  const keywords = [...(parsedQuery?.keywords ?? []), ...(filters.q && !parsedQuery ? [filters.q] : [])];
  if (keywords.length) {
    filtered = filtered.filter((j) => {
      const haystack = `${j.title} ${j.description}`;
      const lexicalHit = cosineSimilarity(keywords.join(" "), haystack) > 0.05;
      const substringHit = keywords.some((k) => haystack.toLowerCase().includes(k));
      return lexicalHit || substringHit;
    });
  }

  const sectors = parsedQuery?.sectors ?? [];
  // Sectors are a soft signal only (no sector field on Job in this build) —
  // folded into the keyword filter above via parsedQuery.keywords, which
  // already includes the sector words typed by the user.
  void sectors;

  const scored: SearchResultItem[] = filtered.map((job) => ({
    job,
    match: profileInput ? computeMatch(profileInput, toMatchJobInput(job)) : null,
  }));

  const sort = filters.sort ?? (profileInput ? "match" : "date");
  scored.sort((a, b) => {
    if (sort === "match" && a.match && b.match) return b.match.score - a.match.score;
    if (sort === "salary") {
      const sa = normalizeMonthly(a.job.salaryMax ?? a.job.salaryMin, a.job.salaryPeriod) ?? 0;
      const sb = normalizeMonthly(b.job.salaryMax ?? b.job.salaryMin, b.job.salaryPeriod) ?? 0;
      return sb - sa;
    }
    return b.job.publishedAt.getTime() - a.job.publishedAt.getTime();
  });

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 20));
  const start = (page - 1) * pageSize;
  const items = scored.slice(start, start + pageSize);

  return { items, total: scored.length, page, pageSize, parsedQuery };
}

function normalizeMonthly(amount: number | null, period: string | null): number | null {
  if (amount == null) return null;
  if (period === "HOUR") return Math.round(amount * 151.67);
  if (period === "YEAR") return Math.round(amount / 12);
  return amount;
}
