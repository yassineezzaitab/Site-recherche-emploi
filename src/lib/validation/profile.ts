import { z } from "zod";

export const CONTRACT_TYPES = [
  "CDI",
  "CDD",
  "STAGE",
  "ALTERNANCE",
  "INTERIM",
  "MISSION",
  "FREELANCE",
  "SAISONNIER",
] as const;

export const EXPERIENCE_LEVELS = [
  "STUDENT",
  "ENTRY",
  "JUNIOR",
  "INTERMEDIATE",
  "SENIOR",
  "ANY",
] as const;

export const REMOTE_PREFERENCES = [
  "ONSITE_ONLY",
  "HYBRID",
  "REMOTE_ONLY",
  "NO_PREFERENCE",
] as const;

export const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
export const SLOTS = ["MORNING", "AFTERNOON", "EVENING", "NIGHT", "WEEKEND"] as const;

// Accepts both date-only ("2023-06-01") and full ISO datetime strings —
// the CV parser produces the former, some clients may send the latter.
const dateLikeSchema = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "Date invalide")
  .optional()
  .nullable();

export const profileSchema = z.object({
  firstName: z.string().trim().max(80).optional().nullable(),
  lastName: z.string().trim().max(80).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  postcode: z.string().trim().max(10).optional().nullable(),
  country: z.string().trim().max(2).optional(),
  headline: z.string().trim().max(160).optional().nullable(),
  summary: z.string().trim().max(2000).optional().nullable(),

  desiredTitles: z.array(z.string().trim().max(100)).max(15).optional(),
  sectors: z.array(z.string().trim().max(100)).max(15).optional(),
  contractTypes: z.array(z.enum(CONTRACT_TYPES)).max(8).optional(),
  minSalaryMonthly: z.number().int().min(0).max(50000).optional().nullable(),
  maxDistanceKm: z.number().int().min(1).max(500).optional().nullable(),
  remotePreference: z.enum(REMOTE_PREFERENCES).optional(),
  experienceLevel: z.enum(EXPERIENCE_LEVELS).optional(),

  availableDays: z.array(z.enum(DAYS)).max(7).optional(),
  availableSlots: z.array(z.enum(SLOTS)).max(5).optional(),
  hoursPerWeekMin: z.number().int().min(0).max(80).optional().nullable(),
  hoursPerWeekMax: z.number().int().min(0).max(80).optional().nullable(),

  hasCar: z.boolean().optional(),
  hasScooter: z.boolean().optional(),
  hasBike: z.boolean().optional(),
  usesPublicTransit: z.boolean().optional(),
  mobilityNotes: z.string().trim().max(500).optional().nullable(),
  constraints: z.string().trim().max(1000).optional().nullable(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const skillInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  level: z.number().int().min(1).max(5).optional(),
});

export const experienceSchema = z.object({
  id: z.string().optional(),
  company: z.string().trim().min(1).max(150),
  title: z.string().trim().min(1).max(150),
  location: z.string().trim().max(150).optional().nullable(),
  startDate: dateLikeSchema,
  endDate: dateLikeSchema,
  isCurrent: z.boolean().optional(),
  description: z.string().trim().max(3000).optional().nullable(),
});

export const educationSchema = z.object({
  id: z.string().optional(),
  institution: z.string().trim().min(1).max(150),
  degree: z.string().trim().max(150).optional().nullable(),
  fieldOfStudy: z.string().trim().max(150).optional().nullable(),
  startDate: dateLikeSchema,
  endDate: dateLikeSchema,
  isCurrent: z.boolean().optional(),
});

export const languageSchema = z.object({
  name: z.string().trim().min(1).max(60),
  level: z.string().trim().max(40).optional().nullable(),
});

export const certificationSchema = z.object({
  name: z.string().trim().min(1).max(150),
  issuer: z.string().trim().max(150).optional().nullable(),
  issuedDate: dateLikeSchema,
});
