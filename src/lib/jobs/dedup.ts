import { createHash } from "crypto";
import type { NormalizedJob } from "./sources/types";

/**
 * Deduplication (see §7 of the spec): the same job can appear on several
 * sources with slightly different formatting. We compute a stable
 * "content fingerprint" from the fields that identify a real-world job
 * posting — company, title, and city — normalized (lowercased, accents
 * stripped, punctuation removed, whitespace collapsed) so that trivial
 * formatting differences between sources don't produce different hashes.
 *
 * This intentionally does NOT include the description (descriptions vary
 * more between sources / can be truncated differently) or the URL/external
 * id (which are source-specific by definition and would defeat the whole
 * point of cross-source dedup).
 */
export function computeContentHash(job: {
  title: string;
  companyName: string;
  city?: string | null;
}): string {
  const normalized = [job.title, job.companyName, job.city ?? ""]
    .map(normalizeForHash)
    .join("|");
  return createHash("sha1").update(normalized).digest("hex");
}

function normalizeForHash(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .sort() // word order shouldn't matter for near-duplicate titles
    .join(" ");
}

export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(sa|sas|sarl|sasu|eurl|groupe|group)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeJob(job: NormalizedJob): NormalizedJob {
  return job;
}
