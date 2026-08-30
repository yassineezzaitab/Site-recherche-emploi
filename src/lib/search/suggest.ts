import { PROFESSIONS } from "./professionsDictionary";
import { FORMATIONS } from "./formationsDictionary";

export interface Suggestion {
  type: "city" | "profession" | "formation";
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

export function suggestProfessions(query: string): Suggestion[] {
  const needle = normalize(query);
  if (needle.length < MIN_QUERY_LENGTH) return [];

  const seen = new Set<string>();
  const results: Suggestion[] = [];
  for (const prof of PROFESSIONS) {
    if (seen.has(prof.canonical)) continue;
    const matches =
      wordPrefixMatch(prof.canonical, needle) || prof.aliases.some((a) => wordPrefixMatch(a, needle));
    if (matches) {
      seen.add(prof.canonical);
      results.push({ type: "profession", label: prof.canonical, value: prof.canonical, meta: prof.category });
      if (results.length >= MAX_RESULTS_PER_TYPE) break;
    }
  }
  return results;
}

export function suggestFormations(query: string): Suggestion[] {
  const needle = normalize(query);
  if (needle.length < MIN_QUERY_LENGTH) return [];

  const seen = new Set<string>();
  const results: Suggestion[] = [];
  for (const formation of FORMATIONS) {
    if (seen.has(formation.canonical)) continue;
    const matches =
      wordPrefixMatch(formation.canonical, needle) ||
      formation.aliases.some((a) => wordPrefixMatch(a, needle));
    if (matches) {
      seen.add(formation.canonical);
      results.push({
        type: "formation",
        label: formation.canonical,
        value: formation.canonical,
        meta: formation.level,
      });
      if (results.length >= MAX_RESULTS_PER_TYPE) break;
    }
  }
  return results;
}
