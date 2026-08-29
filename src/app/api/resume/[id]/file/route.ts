import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError, NotFoundError } from "@/lib/apiResponse";
import { readStoredFile, getSignedDownloadUrl } from "@/lib/storage/fileStorage";

const CONTENT_TYPES: Record<string, string> = {
  PDF: "application/pdf",
  DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  TXT: "text/plain",
};

/**
 * Serves the original uploaded CV file, only to its owner. Never exposed
 * via a public/static path.
 *
 * With STORAGE_DRIVER=s3, this redirects to a short-lived signed URL
 * (5 minutes) so the file bytes flow directly from the object store to the
 * browser instead of proxying through our own server. With the local
 * driver (no signed-URL concept for on-disk files), it streams the file
 * itself, same as before.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const resume = await prisma.resume.findFirst({ where: { id, userId } });
    if (!resume) throw new NotFoundError("CV introuvable");

    const signedUrl = await getSignedDownloadUrl(resume.storageKey, 300);
    if (signedUrl) {
      return NextResponse.redirect(signedUrl);
    }

    const buffer = await readStoredFile(resume.storageKey);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": CONTENT_TYPES[resume.fileType] ?? "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(resume.fileName)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
