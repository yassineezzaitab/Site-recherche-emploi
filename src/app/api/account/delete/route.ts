import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError, jsonError } from "@/lib/apiResponse";
import { deleteStoredFile } from "@/lib/storage/fileStorage";

const schema = z.object({ password: z.string().min(1) });

/**
 * RGPD "droit à l'effacement" (§27): permanently deletes the account and
 * every row that references it (cascading foreign keys — see
 * prisma/schema.prisma) plus the underlying uploaded CV files. Requires
 * re-entering the password as a confirmation step since this is
 * irreversible.
 */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const { password } = schema.parse(await req.json());

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return jsonError("Compte introuvable", 404);

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return jsonError("Mot de passe incorrect", 403);

    const resumes = await prisma.resume.findMany({
      where: { userId },
      select: { storageKey: true },
    });
    await Promise.all(resumes.map((r) => deleteStoredFile(r.storageKey).catch(() => {})));

    const profile = await prisma.profile.findUnique({ where: { userId }, select: { photoKey: true } });
    if (profile?.photoKey) await deleteStoredFile(profile.photoKey).catch(() => {});

    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
