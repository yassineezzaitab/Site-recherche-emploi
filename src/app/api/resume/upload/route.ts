import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError, jsonError } from "@/lib/apiResponse";
import { checkRateLimit } from "@/lib/rateLimit";
import { saveUploadedFile } from "@/lib/storage/fileStorage";
import { detectFileType, extractText } from "@/lib/resume/extractText";
import { parseResume } from "@/lib/resume/parseResume";

const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();

    const rl = checkRateLimit(`resume-upload:${userId}`, { limit: 10, windowMs: 60 * 60 * 1000 });
    if (!rl.ok) return jsonError("Trop d'imports de CV, réessayez plus tard", 429);

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return jsonError("Aucun fichier reçu", 400);
    }
    if (file.size === 0) return jsonError("Le fichier est vide", 400);
    if (file.size > MAX_SIZE_BYTES) {
      return jsonError("Le fichier dépasse la taille maximale autorisée (8 Mo)", 413);
    }

    const fileType = detectFileType(file.name, file.type);
    if (!fileType || (file.type && !ALLOWED_TYPES.includes(file.type))) {
      return jsonError("Format non supporté. Formats acceptés : PDF, DOCX, TXT.", 415);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await saveUploadedFile(userId, file.name, buffer);

    const resume = await prisma.resume.create({
      data: {
        userId,
        fileName: file.name.slice(0, 200),
        fileType,
        storageKey: stored.key,
        sizeBytes: file.size,
        extractionStatus: "PROCESSING",
      },
    });

    try {
      const rawText = await extractText(buffer, fileType);
      const extraction = parseResume(rawText);

      await prisma.resume.update({
        where: { id: resume.id },
        data: {
          rawText,
          extraction: extraction as unknown as object,
          extractionStatus: "DONE",
        },
      });

      return NextResponse.json({
        resume: { id: resume.id, fileName: resume.fileName, fileType: resume.fileType },
        extraction,
      });
    } catch (err) {
      await prisma.resume.update({
        where: { id: resume.id },
        data: {
          extractionStatus: "FAILED",
          extractionError: err instanceof Error ? err.message : String(err),
        },
      });
      return jsonError(
        "Le fichier a été enregistré mais son analyse a échoué. Vérifiez qu'il n'est pas corrompu ou scanné en image.",
        422
      );
    }
  } catch (err) {
    return handleApiError(err);
  }
}
