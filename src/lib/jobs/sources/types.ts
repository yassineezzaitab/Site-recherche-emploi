/**
 * A job in the platform's normalized shape, as produced by any source
 * adapter before it is written to the database (see §6 of the spec: every
 * source has a different format, so every adapter must translate into
 * this one common model).
 */
export interface NormalizedJob {
  externalId: string;
  title: string;
  companyName: string;
  description: string;
  missions?: string;
  city?: string;
  postcode?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  contractType:
    | "CDI"
    | "CDD"
    | "STAGE"
    | "ALTERNANCE"
    | "INTERIM"
    | "MISSION"
    | "FREELANCE"
    | "SAISONNIER";
  experienceLevel: "STUDENT" | "ENTRY" | "JUNIOR" | "INTERMEDIATE" | "SENIOR" | "ANY";
  requiredDegree?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryPeriod?: "HOUR" | "MONTH" | "YEAR";
  hoursPerWeek?: number;
  schedule?: string;
  remoteType: "ONSITE_ONLY" | "HYBRID" | "REMOTE_ONLY";
  requiredSkills: string[];
  languages?: string[];
  url: string;
  contactEmail?: string;
  contactPhone?: string;
  publishedAt: string; // ISO date
  expiresAt?: string;
}

/**
 * Every job source — demo data, a public API, an RSS feed, a partner feed —
 * implements this same interface. The ingestion pipeline (see ingest.ts)
 * doesn't know or care which kind of source it's talking to; it just calls
 * fetchJobs() and normalizes/dedupes/stores the result. Adding a new real
 * source later means writing one new file that implements this interface —
 * nothing else in the app changes.
 */
export interface JobSourceAdapter {
  /** Unique, stable key — must match a `JobSource.key` row in the database. */
  key: string;
  name: string;
  kind: "DEMO" | "PUBLIC_API" | "RSS_FEED" | "PARTNER_FEED";
  /** Whether this adapter can currently run (e.g. required API keys are set). */
  isConfigured(): boolean;
  fetchJobs(): Promise<NormalizedJob[]>;
}
