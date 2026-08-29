import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { handleApiError, NotFoundError } from "@/lib/apiResponse";
import { loadProfileForMatching, persistMatches } from "@/lib/matching/service";
import { computeMatch } from "@/lib/matching/engine";
import { toMatchJobInput } from "@/lib/matching/mappers";
import { haversineKm, estimateCommuteMinutes } from "@/lib/geo/distance";
import { JobSource } from "@prisma/client";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();

    const job = await prisma.job.findUnique({
      where: { id },
      include: { company: true, source: true },
    });
    if (!job || (!job.isActive && !job.duplicateOfId)) {
      // Still allow viewing an inactive-but-not-duplicate job (expired
      // listing) so saved/applied jobs remain viewable; only truly
      // missing rows 404.
      if (!job) throw new NotFoundError("Offre introuvable");
    }

    let match = null;
    let profileInput = null;
    if (session?.user?.id) {
      try {
        profileInput = await loadProfileForMatching(session.user.id);
        match = computeMatch(profileInput, toMatchJobInput(job));
        await persistMatches(session.user.id, new Map([[job.id, match]]));
      } catch {
        match = null;
      }
    }

    const distanceKm =
      profileInput?.latitude != null && profileInput?.longitude != null && job.latitude != null && job.longitude != null
        ? haversineKm(profileInput.latitude, profileInput.longitude, job.latitude, job.longitude)
        : null;

    return NextResponse.json({
      job: {
        ...job,
        isDemo: (job.source as JobSource).kind === "DEMO",
        sourceName: job.source.name,
      },
      match,
      distanceKm: distanceKm != null ? Math.round(distanceKm) : null,
      commuteMinutes: distanceKm != null ? estimateCommuteMinutes(distanceKm) : null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
