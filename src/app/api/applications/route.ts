import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiResponse";

export async function GET() {
  try {
    const userId = await requireUserId();
    const applications = await prisma.application.findMany({
      where: { userId },
      include: { job: { include: { company: true } }, events: { orderBy: { createdAt: "desc" } } },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ applications });
  } catch (err) {
    return handleApiError(err);
  }
}

const createSchema = z.object({
  jobId: z.string().min(1),
  status: z
    .enum(["TO_REVIEW", "TO_PREPARE", "SENT", "INTERVIEW", "REJECTED", "ACCEPTED"])
    .optional(),
});

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const { jobId, status } = createSchema.parse(await req.json());

    const application = await prisma.application.upsert({
      where: { userId_jobId: { userId, jobId } },
      update: {},
      create: {
        userId,
        jobId,
        status: status ?? "TO_REVIEW",
        events: { create: { status: status ?? "TO_REVIEW" } },
      },
      include: { job: true, events: true },
    });

    return NextResponse.json({ application }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
