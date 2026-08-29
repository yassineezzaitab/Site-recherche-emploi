import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiResponse";

export async function GET() {
  try {
    const userId = await requireUserId();
    const alerts = await prisma.alert.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ alerts });
  } catch (err) {
    return handleApiError(err);
  }
}

const querySchema = z.object({
  q: z.string().max(500).optional(),
  contractTypes: z.array(z.string()).optional(),
  remote: z.array(z.string()).optional(),
  minSalaryMonthly: z.number().optional(),
  maxDistanceKm: z.number().optional(),
  hoursMax: z.number().optional(),
  experienceLevel: z.string().optional(),
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  query: querySchema,
  minScore: z.number().min(0).max(100).optional(),
});

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const data = createSchema.parse(await req.json());

    const alert = await prisma.alert.create({
      data: {
        userId,
        name: data.name,
        query: data.query,
        minScore: data.minScore ?? 70,
      },
    });

    return NextResponse.json({ alert }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
