import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiResponse";
import {
  profileSchema,
  experienceSchema,
  educationSchema,
  languageSchema,
  certificationSchema,
  skillInputSchema,
} from "@/lib/validation/profile";
import { geocodeAddress } from "@/lib/geo/geocode";

const fullProfileInclude = {
  skills: { include: { skill: true } },
  experiences: { orderBy: { order: "asc" as const } },
  educations: { orderBy: { order: "asc" as const } },
  languages: true,
  certifications: true,
};

export async function GET() {
  try {
    const userId = await requireUserId();
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: fullProfileInclude,
    });
    return NextResponse.json({ profile });
  } catch (err) {
    return handleApiError(err);
  }
}

const updateBodySchema = z.object({
  profile: profileSchema.partial().optional(),
  skills: z.array(skillInputSchema).optional(),
  experiences: z.array(experienceSchema).optional(),
  educations: z.array(educationSchema).optional(),
  languages: z.array(languageSchema).optional(),
  certifications: z.array(certificationSchema).optional(),
});

export async function PUT(req: Request) {
  try {
    const userId = await requireUserId();
    const body = updateBodySchema.parse(await req.json());

    let existing = await prisma.profile.findUnique({ where: { userId } });

    // Best-effort geocoding when the city changes, so distance-based
    // matching has coordinates to work with. Never blocks the save if it
    // fails (see geocodeAddress — fails soft).
    let coords: { latitude: number; longitude: number } | null = null;
    if (body.profile?.city && body.profile.city !== existing?.city) {
      const geo = await geocodeAddress(
        `${body.profile.postcode ?? ""} ${body.profile.city}`.trim()
      );
      if (geo) coords = { latitude: geo.latitude, longitude: geo.longitude };
    }

    if (!existing) {
      existing = await prisma.profile.create({
        data: { userId, ...(body.profile ?? {}), ...(coords ?? {}) },
      });
    } else if (body.profile) {
      existing = await prisma.profile.update({
        where: { userId },
        data: { ...body.profile, ...(coords ?? {}) },
      });
    }

    if (body.skills) {
      await prisma.profileSkill.deleteMany({ where: { profileId: existing.id } });
      for (const s of body.skills) {
        const skill = await prisma.skill.upsert({
          where: { name: s.name },
          update: {},
          create: { name: s.name },
        });
        await prisma.profileSkill.create({
          data: { profileId: existing.id, skillId: skill.id, level: s.level ?? 3 },
        });
      }
    }

    if (body.experiences) {
      await prisma.experience.deleteMany({ where: { profileId: existing.id } });
      await prisma.experience.createMany({
        data: body.experiences.map((e, i) => ({
          profileId: existing!.id,
          company: e.company,
          title: e.title,
          location: e.location ?? null,
          startDate: e.startDate ? new Date(e.startDate) : null,
          endDate: e.endDate ? new Date(e.endDate) : null,
          isCurrent: e.isCurrent ?? false,
          description: e.description ?? null,
          order: i,
        })),
      });
    }

    if (body.educations) {
      await prisma.education.deleteMany({ where: { profileId: existing.id } });
      await prisma.education.createMany({
        data: body.educations.map((e, i) => ({
          profileId: existing!.id,
          institution: e.institution,
          degree: e.degree ?? null,
          fieldOfStudy: e.fieldOfStudy ?? null,
          startDate: e.startDate ? new Date(e.startDate) : null,
          endDate: e.endDate ? new Date(e.endDate) : null,
          isCurrent: e.isCurrent ?? false,
          order: i,
        })),
      });
    }

    if (body.languages) {
      await prisma.profileLanguage.deleteMany({ where: { profileId: existing.id } });
      await prisma.profileLanguage.createMany({
        data: body.languages.map((l) => ({
          profileId: existing!.id,
          name: l.name,
          level: l.level ?? null,
        })),
      });
    }

    if (body.certifications) {
      await prisma.certification.deleteMany({ where: { profileId: existing.id } });
      await prisma.certification.createMany({
        data: body.certifications.map((c) => ({
          profileId: existing!.id,
          name: c.name,
          issuer: c.issuer ?? null,
          issuedDate: c.issuedDate ? new Date(c.issuedDate) : null,
        })),
      });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: fullProfileInclude,
    });
    return NextResponse.json({ profile });
  } catch (err) {
    return handleApiError(err);
  }
}
