import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError, NotFoundError } from "@/lib/apiResponse";

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const existing = await prisma.notification.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError("Notification introuvable");

    const notification = await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
    return NextResponse.json({ notification });
  } catch (err) {
    return handleApiError(err);
  }
}
