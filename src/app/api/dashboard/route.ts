import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiResponse";
import { searchJobs } from "@/lib/jobs/search";
import { loadProfileForMatching, persistMatches } from "@/lib/matching/service";

export async function GET() {
  try {
    const userId = await requireUserId();

    let topMatches: Awaited<ReturnType<typeof searchJobs>>["items"] = [];
    let hasProfile = true;
    try {
      const profileInput = await loadProfileForMatching(userId);
      const result = await searchJobs({ sort: "match", pageSize: 6 }, profileInput);
      topMatches = result.items;
      const matchMap = new Map(result.items.filter((i) => i.match).map((i) => [i.job.id, i.match!]));
      if (matchMap.size) await persistMatches(userId, matchMap);
    } catch {
      hasProfile = false;
    }

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [newJobsToday, savedCount, applicationsCount, activeAlertsCount, recentNotifications] =
      await Promise.all([
        prisma.job.count({ where: { isActive: true, duplicateOfId: null, createdAt: { gte: dayAgo } } }),
        prisma.savedJob.count({ where: { userId } }),
        prisma.application.count({ where: { userId } }),
        prisma.alert.count({ where: { userId, isActive: true } }),
        prisma.notification.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);

    return NextResponse.json({
      hasProfile,
      newJobsToday,
      savedCount,
      applicationsCount,
      activeAlertsCount,
      recentNotifications,
      topMatches: topMatches.map(({ job, match }) => ({
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
        distanceKm: null,
        commuteMinutes: null,
        match: match ? { score: match.score, dimensions: match.dimensions } : null,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
