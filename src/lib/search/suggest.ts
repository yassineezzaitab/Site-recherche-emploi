import { PROFESSIONS } from "./professionsDictionary";
import { FORMATIONS } from "./formationsDictionary";
import { SKILLS } from "@/lib/resume/skillsDictionary";

export interface Suggestion {
  type: "city" | "profession" | "formation" | "skill" | "sector";
  label: string;
  value: string;
  meta?: string;
  latitude?: number;
  longitude?: number;
}

// Unicode combining diacritical marks (U+0300–U+036F), left behind by
// String.normalize("NFD") when it decomposes an accented letter into a
// base letter + mark — e.g. "é" becomes "e" + U+0301.
const COMBINING_MARKS = /[̀-ͯ]/g;

/** Strips accents and lowercases, so "développeur" matches "dev" and "École" matches "ecole". */
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .trim();
}

/** True if any word in `haystack` starts with `needle` (word-boundary prefix match). */
function wordPrefixMatch(haystack: string, needle: string): boolean {
  if (!needle) return false;
  const words = normalize(haystack).split(/[\s'’-]+/);
  return words.some((w) => w.startsWith(needle));
}

const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS_PER_TYPE = 6;

interface DictionaryEntry {
  canonical: string;
  aliases: string[];
}

/** Shared prefix-match-and-dedup logic behind every suggest* function below. */
function matchDictionary<T extends DictionaryEntry>(
  query: string,
  dictionary: T[],
  type: Suggestion["type"],
  metaOf: (entry: T) => string | undefined
): Suggestion[] {
  const needle = normalize(query);
  if (needle.length < MIN_QUERY_LENGTH) return [];

  const seen = new Set<string>();
  const results: Suggestion[] = [];
  for (const entry of dictionary) {
    if (seen.has(entry.canonical)) continue;
    const matches =
      wordPrefixMatch(entry.canonical, needle) || entry.aliases.some((a) => wordPrefixMatch(a, needle));
    if (matches) {
      seen.add(entry.canonical);
      results.push({ type, label: entry.canonical, value: entry.canonical, meta: metaOf(entry) });
      if (results.length >= MAX_RESULTS_PER_TYPE) break;
    }
  }
  return results;
}

export function suggestProfessions(query: string): Suggestion[] {
  return matchDictionary(query, PROFESSIONS, "profession", (p) => p.category);
}

export function suggestFormations(query: string): Suggestion[] {
  return matchDictionary(query, FORMATIONS, "formation", (f) => f.level);
}

/** Reuses the same curated dictionary CV parsing uses — no separate list to keep in sync. */
export function suggestSkills(query: string): Suggestion[] {
  return matchDictionary(query, SKILLS, "skill", (s) => s.category);
}

// Not a separate curated list: derived from the profession dictionary's own
// category labels, so it never drifts out of sync and never invents a
// sector that isn't backed by real profession entries.
const SECTORS: DictionaryEntry[] = Array.from(new Set(PROFESSIONS.map((p) => p.category))).map(
  (category) => ({ canonical: category, aliases: [category] })
);

export function suggestSectors(query: string): Suggestion[] {
  return matchDictionary(query, SECTORS, "sector", () => undefined);
}
