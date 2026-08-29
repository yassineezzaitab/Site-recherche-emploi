import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError, NotFoundError } from "@/lib/apiResponse";
import { readStoredFile } from "@/lib/storage/fileStorage";

const CONTENT_TYPES: Record<string, string> = {
  PDF: "application/pdf",
  DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  TXT: "text/plain",
};

/** Serves the original uploaded CV file, only to its owner. Never exposed via a public/static path. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const resume = await prisma.resume.findFirst({ where: { id, userId } });
    if (!resume) throw new NotFoundError("CV introuvable");

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
