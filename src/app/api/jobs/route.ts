import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiResponse";
import { searchJobs } from "@/lib/jobs/search";
import { loadProfileForMatching, persistMatches } from "@/lib/matching/service";
import { estimateCommuteMinutes, haversineKm } from "@/lib/geo/distance";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(req.url);

    const filters = {
      q: searchParams.get("q") ?? undefined,
      contractTypes: searchParams.get("contractTypes")?.split(",").filter(Boolean),
      remote: searchParams.get("remote")?.split(",").filter(Boolean) as never,
      minSalaryMonthly: numOrUndefined(searchParams.get("minSalary")),
      maxDistanceKm: numOrUndefined(searchParams.get("maxDistanceKm")),
      experienceLevel: searchParams.get("experienceLevel") ?? undefined,
      hoursMax: numOrUndefined(searchParams.get("hoursMax")),
      sort: (searchParams.get("sort") as "match" | "date" | "salary") ?? undefined,
      page: numOrUndefined(searchParams.get("page")),
      pageSize: numOrUndefined(searchParams.get("pageSize")),
    };

    let profileInput = null;
    if (session?.user?.id) {
      try {
        profileInput = await loadProfileForMatching(session.user.id);
      } catch {
        profileInput = null; // no profile yet — search still works, just unscored
      }
    }

    const result = await searchJobs(filters, profileInput);

    if (session?.user?.id && result.items.length > 0) {
      const matchMap = new Map(
        result.items.filter((i) => i.match).map((i) => [i.job.id, i.match!])
      );
      if (matchMap.size > 0) {
        persistMatches(session.user.id, matchMap).catch((e) =>
          console.error("persistMatches failed", e)
        );
      }
    }

    const items = result.items.map(({ job, match }) => ({
      id: job.id,
      title: job.title,
      companyNameRaw: job.companyNameRaw,
      city: job.city,
      region: job.region,
      contractType: job.contractType,
      experienceLevel: job.experienceLevel,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryPeriod: job.salaryPeriod,
      hoursPerWeek: job.hoursPerWeek,
      remoteType: job.remoteType,
      publishedAt: job.publishedAt,
      lastVerifiedAt: job.lastVerifiedAt,
      requiredSkills: job.requiredSkills,
      latitude: job.latitude,
      longitude: job.longitude,
      distanceKm:
        profileInput?.latitude != null && profileInput?.longitude != null && job.latitude != null && job.longitude != null
          ? Math.round(haversineKm(profileInput.latitude, profileInput.longitude, job.latitude, job.longitude))
          : null,
      commuteMinutes:
        profileInput?.latitude != null && profileInput?.longitude != null && job.latitude != null && job.longitude != null
          ? estimateCommuteMinutes(haversineKm(profileInput.latitude, profileInput.longitude, job.latitude, job.longitude))
          : null,
      match: match ? { score: match.score, dimensions: match.dimensions } : null,
    }));

    return NextResponse.json({
      items,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      parsedQuery: result.parsedQuery,
      hasProfile: !!profileInput,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

function numOrUndefined(v: string | null): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
