import type { Job } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeMatch } from "./engine";
import { toMatchJobInput, toMatchProfileInput } from "./mappers";
import type { MatchResult } from "./types";
import { NotFoundError } from "@/lib/apiResponse";

export async function loadProfileForMatching(userId: string) {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: { skills: { include: { skill: true } }, experiences: true },
  });
  if (!profile) {
    throw new NotFoundError(
      "Complétez votre profil avant de consulter vos correspondances."
    );
  }
  return toMatchProfileInput(profile);
}

export function matchJobsForProfile(
  profileInput: ReturnType<typeof toMatchProfileInput>,
  jobs: Job[]
): Map<string, MatchResult> {
  const results = new Map<string, MatchResult>();
  for (const job of jobs) {
    results.set(job.id, computeMatch(profileInput, toMatchJobInput(job)));
  }
  return results;
}

/** Persists computed matches so the dashboard/alerts can query them cheaply later. */
export async function persistMatches(userId: string, results: Map<string, MatchResult>) {
  const entries = Array.from(results.entries());
  await Promise.all(
    entries.map(([jobId, result]) =>
      prisma.match.upsert({
        where: { userId_jobId: { userId, jobId } },
        update: { score: result.score, breakdown: result as unknown as object, computedAt: new Date() },
        create: {
          userId,
          jobId,
          score: result.score,
          breakdown: result as unknown as object,
        },
      })
    )
  );
}
