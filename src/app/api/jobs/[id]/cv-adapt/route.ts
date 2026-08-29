import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError, NotFoundError } from "@/lib/apiResponse";
import { adaptCvToJob } from "@/lib/generation/cvAdapt";

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
    if (!profile) throw new NotFoundError("Complétez votre profil avant d'adapter votre CV.");

    const adapted = adaptCvToJob(profile, job);
    return NextResponse.json({ adapted });
  } catch (err) {
    return handleApiError(err);
  }
}
