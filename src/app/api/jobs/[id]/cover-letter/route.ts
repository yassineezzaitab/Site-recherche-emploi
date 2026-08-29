import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError, NotFoundError } from "@/lib/apiResponse";
import { generateCoverLetter } from "@/lib/generation/coverLetter";
import { computeMatch } from "@/lib/matching/engine";
import { toMatchJobInput } from "@/lib/matching/mappers";
import { loadProfileForMatching } from "@/lib/matching/service";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const [job, profile] = await Promise.all([
      prisma.job.findUnique({ where: { id } }),
      prisma.profile.findUnique({
        where: { userId },
        include: { experiences: true, educations: true, skills: { include: { skill: true } } },
      }),
    ]);
    if (!job) throw new NotFoundError("Offre introuvable");
    if (!profile) throw new NotFoundError("Complétez votre profil avant de générer une lettre de motivation.");

    const matchInput = await loadProfileForMatching(userId).catch(() => null);
    const match = matchInput ? computeMatch(matchInput, toMatchJobInput(job)) : null;

    const letter = generateCoverLetter(profile, job, match);

    return NextResponse.json({ letter });
  } catch (err) {
    return handleApiError(err);
  }
}
