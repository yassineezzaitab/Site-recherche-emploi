import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiResponse";

export async function GET() {
  try {
    const userId = await requireUserId();
    const saved = await prisma.savedJob.findMany({
      where: { userId },
      include: { job: { include: { company: true } } },
      orderBy: [{ rank: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ saved });
  } catch (err) {
    return handleApiError(err);
  }
}

const createSchema = z.object({
  jobId: z.string().min(1),
  note: z.string().max(1000).optional(),
});

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const { jobId, note } = createSchema.parse(await req.json());

    const saved = await prisma.savedJob.upsert({
      where: { userId_jobId: { userId, jobId } },
      update: { note },
      create: { userId, jobId, note },
      include: { job: true },
    });

    return NextResponse.json({ saved }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
