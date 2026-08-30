import { prisma } from "@/lib/prisma";
import { computeContentHash, normalizeCompanyName } from "./dedup";
import { getConfiguredSources } from "./sources/registry";
import type { NormalizedJob } from "./sources/types";
import type { JobSourceAdapter } from "./sources/types";

const STALE_AFTER_DAYS = 14;

export interface IngestSummary {
  source: string;
  fetched: number;
  created: number;
  updated: number;
  markedDuplicate: number;
  failed: boolean;
  error?: string;
}

async function ensureJobSourceRow(adapter: JobSourceAdapter) {
  return prisma.jobSource.upsert({
    where: { key: adapter.key },
    update: {},
    create: {
      key: adapter.key,
      name: adapter.name,
      kind: adapter.kind,
      isActive: true,
    },
  });
}

async function resolveCompanyId(companyName: string): Promise<string> {
  const normalizedName = normalizeCompanyName(companyName) || companyName.toLowerCase();
  const company = await prisma.company.upsert({
    where: { normalizedName },
    update: {},
    create: { name: companyName, normalizedName },
  });
  return company.id;
}

async function upsertOneJob(sourceRowId: string, job: NormalizedJob): Promise<"created" | "updated" | "duplicate"> {
  const contentHash = computeContentHash({
    title: job.title,
    companyName: job.companyName,
    city: job.city,
  });
  const companyId = await resolveCompanyId(job.companyName);

  // Cross-source duplicate detection (§7): a different job row, from a
  // different (source, externalId) pair, with the same content
  // fingerprint. If one exists and is active, we still record this
  // observation (so the source's own freshness tracking stays correct)
  // but mark it inactive/duplicateOf so it never shows up twice in results.
  const existingByHash = await prisma.job.findFirst({
    where: {
      contentHash,
      NOT: { AND: [{ sourceId: sourceRowId }, { externalId: job.externalId }] },
      duplicateOfId: null,
    },
    select: { id: true },
  });

  const existingBySourceExternalId = await prisma.job.findUnique({
    where: { sourceId_externalId: { sourceId: sourceRowId, externalId: job.externalId } },
    select: { id: true },
  });

  const data = {
    title: job.title,
    companyId,
    companyNameRaw: job.companyName,
    description: job.description,
    missions: job.missions,
    city: job.city,
    postcode: job.postcode,
    region: job.region,
    country: job.country ?? "FR",
    latitude: job.latitude,
    longitude: job.longitude,
    contractType: job.contractType,
    experienceLevel: job.experienceLevel,
    requiredDegree: job.requiredDegree,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryPeriod: job.salaryPeriod,
    hoursPerWeek: job.hoursPerWeek,
    schedule: job.schedule,
    remoteType: job.remoteType,
    requiredSkills: job.requiredSkills,
    languages: job.languages ?? [],
    url: job.url,
    contactEmail: job.contactEmail,
    contactPhone: job.contactPhone,
    publishedAt: new Date(job.publishedAt),
    expiresAt: job.expiresAt ? new Date(job.expiresAt) : null,
    lastVerifiedAt: new Date(),
    contentHash,
    isActive: !existingByHash,
    duplicateOfId: existingByHash?.id ?? null,
  };

  if (existingBySourceExternalId) {
    await prisma.job.update({ where: { id: existingBySourceExternalId.id }, data });
    return existingByHash ? "duplicate" : "updated";
  }

  await prisma.job.create({
    data: { ...data, sourceId: sourceRowId, externalId: job.externalId },
  });
  return existingByHash ? "duplicate" : "created";
}

export async function ingestAllSources(): Promise<IngestSummary[]> {
  const adapters = getConfiguredSources();
  const summaries: IngestSummary[] = [];
  const usingDemo = adapters.some((a) => a.kind === "DEMO");

  for (const adapter of adapters) {
    const sourceRow = await ensureJobSourceRow(adapter);
    const summary: IngestSummary = {
      source: adapter.key,
      fetched: 0,
      created: 0,
      updated: 0,
      markedDuplicate: 0,
      failed: false,
    };

    try {
      const jobs = await adapter.fetchJobs();
      summary.fetched = jobs.length;

      for (const job of jobs) {
        const outcome = await upsertOneJob(sourceRow.id, job);
        if (outcome === "created") summary.created += 1;
        else if (outcome === "updated") summary.updated += 1;
        else summary.markedDuplicate += 1;
      }

      await prisma.jobSource.update({
        where: { id: sourceRow.id },
        data: { lastSyncAt: new Date(), lastSyncOk: true },
      });
    } catch (err) {
      summary.failed = true;
      summary.error = err instanceof Error ? err.message : String(err);
      await prisma.jobSource.update({
        where: { id: sourceRow.id },
        data: { lastSyncAt: new Date(), lastSyncOk: false },
      });
    }

    summaries.push(summary);
  }

  // The moment real sources are in use, any demo listings ingested during
  // an earlier demo-mode run must stop appearing to real users — don't
  // just let them quietly expire over the next STALE_AFTER_DAYS days (§20:
  // demo data must never be mixed into a real user's results).
  if (!usingDemo) {
    await deactivateDemoJobs();
  }

  await expireStaleJobs();
  return summaries;
}

async function deactivateDemoJobs(): Promise<number> {
  const demoSources = await prisma.jobSource.findMany({ where: { kind: "DEMO" }, select: { id: true } });
  if (demoSources.length === 0) return 0;
  const result = await prisma.job.updateMany({
    where: { isActive: true, sourceId: { in: demoSources.map((s) => s.id) } },
    data: { isActive: false },
  });
  return result.count;
}

/**
 * Freshness / expiration (§8): a job that hasn't been re-verified by any
 * source sync in STALE_AFTER_DAYS, or whose explicit expiresAt has passed,
 * is deactivated (hidden from search) rather than deleted — we keep the
 * row for audit/history and so an existing Application/SavedJob referencing
 * it doesn't break.
 */
export async function expireStaleJobs(): Promise<number> {
  const staleThreshold = new Date();
  staleThreshold.setDate(staleThreshold.getDate() - STALE_AFTER_DAYS);

  const result = await prisma.job.updateMany({
    where: {
      isActive: true,
      OR: [{ lastVerifiedAt: { lt: staleThreshold } }, { expiresAt: { lt: new Date() } }],
    },
    data: { isActive: false },
  });
  return result.count;
}
