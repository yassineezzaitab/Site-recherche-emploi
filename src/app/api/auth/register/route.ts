import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation/auth";
import { handleApiError, jsonError } from "@/lib/apiResponse";
import { checkRateLimit, clientKey } from "@/lib/rateLimit";

const CONSENT_VERSION = "2026-08-29";

export async function POST(req: Request) {
  try {
    // Anti brute-force / anti spam-signup: 10 attempts / 15 min / IP.
    const rl = checkRateLimit(`register:${clientKey(req)}`, {
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });
    if (!rl.ok) return jsonError("Trop de tentatives, réessayez plus tard", 429);

    const body = await req.json();
    const data = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      // Don't reveal which emails are registered in the error message
      // beyond the generic conflict — this is a reasonable UX/security
      // trade-off for a consumer signup flow.
      return jsonError("Un compte existe déjà avec cet email", 409);
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        consentAcceptedAt: new Date(),
        consentVersion: CONSENT_VERSION,
        marketingOptIn: data.marketingOptIn,
      },
      select: { id: true, email: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
