import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError, NotFoundError } from "@/lib/apiResponse";

const updateSchema = z.object({
  note: z.string().max(1000).optional(),
  rank: z.number().int().min(0).max(1000).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const data = updateSchema.parse(await req.json());

    const existing = await prisma.savedJob.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError("Favori introuvable");

    const saved = await prisma.savedJob.update({ where: { id }, data });
    return NextResponse.json({ saved });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const existing = await prisma.savedJob.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError("Favori introuvable");

    await prisma.savedJob.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
