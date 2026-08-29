import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError, NotFoundError } from "@/lib/apiResponse";
import { deleteStoredFile } from "@/lib/storage/fileStorage";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const resume = await prisma.resume.findFirst({ where: { id, userId } });
    if (!resume) throw new NotFoundError("CV introuvable");
    return NextResponse.json({
      resume: {
        id: resume.id,
        fileName: resume.fileName,
        fileType: resume.fileType,
        extractionStatus: resume.extractionStatus,
        extraction: resume.extraction,
        uploadedAt: resume.uploadedAt,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const resume = await prisma.resume.findFirst({ where: { id, userId } });
    if (!resume) throw new NotFoundError("CV introuvable");

    await deleteStoredFile(resume.storageKey);
    await prisma.resume.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
