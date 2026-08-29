import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError, NotFoundError } from "@/lib/apiResponse";

const STATUS_VALUES = ["TO_REVIEW", "TO_PREPARE", "SENT", "INTERVIEW", "REJECTED", "ACCEPTED"] as const;

const updateSchema = z.object({
  status: z.enum(STATUS_VALUES).optional(),
  notes: z.string().max(3000).optional().nullable(),
  coverLetter: z.string().max(8000).optional().nullable(),
  appliedAt: z.string().datetime().optional().nullable(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const data = updateSchema.parse(await req.json());

    const existing = await prisma.application.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError("Candidature introuvable");

    const statusChanged = data.status && data.status !== existing.status;

    const application = await prisma.application.update({
      where: { id },
      data: {
        ...data,
        appliedAt: data.appliedAt ? new Date(data.appliedAt) : undefined,
        ...(statusChanged
          ? { events: { create: { status: data.status! } } }
          : {}),
      },
      include: { job: true, events: { orderBy: { createdAt: "desc" } } },
    });

    return NextResponse.json({ application });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const existing = await prisma.application.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError("Candidature introuvable");

    await prisma.application.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
