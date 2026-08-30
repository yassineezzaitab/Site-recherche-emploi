import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError, jsonError, NotFoundError } from "@/lib/apiResponse";
import { checkRateLimit } from "@/lib/rateLimit";
import { saveUploadedFile, readStoredFile, deleteStoredFile, getSignedDownloadUrl } from "@/lib/storage/fileStorage";

const MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

/**
 * Manual profile photo upload. CVs are text-only (pdf-parse/mammoth don't
 * extract embedded images), so this is the only way a candidate gets a
 * photo on their profile — there is no "extracted from CV" path.
 */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();

    const rl = checkRateLimit(`profile-photo-upload:${userId}`, { limit: 10, windowMs: 60 * 60 * 1000 });
    if (!rl.ok) return jsonError("Trop d'imports de photo, réessayez plus tard", 429);

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return jsonError("Aucun fichier reçu", 400);
    }
    if (file.size === 0) return jsonError("Le fichier est vide", 400);
    if (file.size > MAX_SIZE_BYTES) {
      return jsonError("La photo dépasse la taille maximale autorisée (4 Mo)", 413);
    }

    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      return jsonError("Format non supporté. Formats acceptés : JPG, PNG, WEBP.", 415);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await saveUploadedFile(userId, `photo${ext}`, buffer);

    const existing = await prisma.profile.findUnique({ where: { userId } });
    const previousKey = existing?.photoKey ?? null;

    const profile = existing
      ? await prisma.profile.update({
          where: { userId },
          data: { photoKey: stored.key, photoContentType: file.type },
        })
      : await prisma.profile.create({
          data: { userId, photoKey: stored.key, photoContentType: file.type },
        });

    if (previousKey && previousKey !== stored.key) {
      await deleteStoredFile(previousKey).catch(() => {});
    }

    return NextResponse.json({ hasPhoto: true, updatedAt: profile.updatedAt });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Serves the current user's own profile photo. Never exposed publicly. */
export async function GET() {
  try {
    const userId = await requireUserId();
    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile?.photoKey) throw new NotFoundError("Aucune photo de profil");

    const signedUrl = await getSignedDownloadUrl(profile.photoKey, 300);
    if (signedUrl) {
      return NextResponse.redirect(signedUrl);
    }

    const buffer = await readStoredFile(profile.photoKey);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": profile.photoContentType ?? "application/octet-stream",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE() {
  try {
    const userId = await requireUserId();
    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile?.photoKey) return NextResponse.json({ hasPhoto: false });

    await deleteStoredFile(profile.photoKey).catch(() => {});
    await prisma.profile.update({
      where: { userId },
      data: { photoKey: null, photoContentType: null },
    });

    return NextResponse.json({ hasPhoto: false });
  } catch (err) {
    return handleApiError(err);
  }
}
