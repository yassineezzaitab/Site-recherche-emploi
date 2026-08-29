import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError, NotFoundError } from "@/lib/apiResponse";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  isActive: z.boolean().optional(),
  minScore: z.number().min(0).max(100).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const data = updateSchema.parse(await req.json());

    const existing = await prisma.alert.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError("Alerte introuvable");

    const alert = await prisma.alert.update({ where: { id }, data });
    return NextResponse.json({ alert });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const existing = await prisma.alert.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError("Alerte introuvable");

    await prisma.alert.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
