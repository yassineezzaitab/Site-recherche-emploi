import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiResponse";

export async function GET() {
  try {
    const userId = await requireUserId();
    const resumes = await prisma.resume.findMany({
      where: { userId },
      orderBy: { uploadedAt: "desc" },
      select: {
        id: true,
        fileName: true,
        fileType: true,
        sizeBytes: true,
        extractionStatus: true,
        uploadedAt: true,
      },
    });
    return NextResponse.json({ resumes });
  } catch (err) {
    return handleApiError(err);
  }
}
