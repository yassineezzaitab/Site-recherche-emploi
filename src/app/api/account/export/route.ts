import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiResponse";

/**
 * RGPD "droit à la portabilité" (§27): a full machine-readable export of
 * everything the platform stores about the user. Deliberately excludes
 * the password hash. Resume file contents (the actual PDF/DOCX bytes)
 * aren't inlined here — this exports the structured data derived from
 * them; the files themselves can be downloaded individually from
 * /api/resume/[id]/file while the account still exists.
 */
export async function GET() {
  try {
    const userId = await requireUserId();

    const [user, profile, resumes, savedJobs, applications, alerts, notifications] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            createdAt: true,
            consentAcceptedAt: true,
            consentVersion: true,
            marketingOptIn: true,
          },
        }),
        prisma.profile.findUnique({
          where: { userId },
          include: {
            skills: { include: { skill: true } },
            experiences: true,
            educations: true,
            languages: true,
            certifications: true,
          },
        }),
        prisma.resume.findMany({
          where: { userId },
          select: {
            id: true,
            fileName: true,
            fileType: true,
            uploadedAt: true,
            extraction: true,
          },
        }),
        prisma.savedJob.findMany({ where: { userId }, include: { job: true } }),
        prisma.application.findMany({ where: { userId }, include: { job: true, events: true } }),
        prisma.alert.findMany({ where: { userId } }),
        prisma.notification.findMany({ where: { userId } }),
      ]);

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      user,
      profile,
      resumes,
      savedJobs,
      applications,
      alerts,
      notifications,
    };

    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="mes-donnees-${userId}.json"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
