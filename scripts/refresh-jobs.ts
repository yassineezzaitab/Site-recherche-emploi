/**
 * Refreshes job listings from all configured sources. Intended to be run
 * on a schedule (cron, GitHub Action, Vercel Cron...) — see README for a
 * suggested schedule. Safe to run repeatedly: it upserts by (source,
 * externalId), re-verifies freshness, and re-runs de-duplication.
 */
import { ingestAllSources } from "../src/lib/jobs/ingest";
import { prisma } from "../src/lib/prisma";

async function main() {
  const summaries = await ingestAllSources();
  for (const s of summaries) {
    console.log(
      `[${s.source}] fetched=${s.fetched} created=${s.created} updated=${s.updated} duplicates=${s.markedDuplicate} failed=${s.failed}${
        s.error ? ` error=${s.error}` : ""
      }`
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
