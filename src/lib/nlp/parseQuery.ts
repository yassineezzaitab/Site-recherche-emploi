/**
 * Deterministic natural-language search parser (French).
 *
 * Turns a free-text sentence like:
 *   "Je suis étudiant en école d'ingénieur. Je peux travailler 10 à 15
 *    heures par semaine, principalement le soir et le samedi. Je cherche
 *    quelque chose à moins de 30 minutes de chez moi."
 * into structured search criteria.
 *
 * This is implemented as a battery of targeted regexes rather than an LLM
 * call: the vocabulary of job-search constraints (hours/week, days,
 * distance/commute time, salary, contract type, sector, experience level)
 * is small and highly patterned in French, so rules are more reliable,
 * instant, free, and auditable than a generative model — and they never
 * fabricate a criterion that wasn't actually said. Anything the rules don't
 * recognize is preserved verbatim in `freeText` and still used as a
 * lexical search fallback against job titles/descriptions.
 */

export interface ParsedQuery {
  hoursPerWeekMin: number | null;
  hoursPerWeekMax: number | null;
  days: string[]; // MON..SUN
  slots: string[]; // MORNING, AFTERNOON, EVENING, NIGHT, WEEKEND
  maxDistanceKm: number | null;
  maxCommuteMinutes: number | null;
  minSalaryMonthly: number | null;
  contractTypes: string[];
  experienceLevel: "STUDENT" | "ENTRY" | null;
  sectors: string[];
  remotePreference: "REMOTE_ONLY" | "HYBRID" | null;
  keywords: string[]; // job-title-ish keywords extracted for lexical search
  freeText: string;
  matchedRules: string[]; // which rules fired — useful for debugging/UI transparency
}

const DAY_MAP: Record<string, string> = {
  lundi: "MON",
  mardi: "TUE",
  mercredi: "WED",
  jeudi: "THU",
  vendredi: "FRI",
  samedi: "SAT",
  dimanche: "SUN",
};

const SECTOR_KEYWORDS: Record<string, string> = {
  marketing: "Marketing",
  vente: "Commerce / Vente",
  commerce: "Commerce / Vente",
  restauration: "Restauration",
  informatique: "Informatique",
  "développement": "Informatique",
  logistique: "Logistique",
  "évènementiel": "Événementiel",
  evenementiel: "Événementiel",
  animation: "Animation",
  enseignement: "Éducation",
  soutien: "Éducation",
  garde: "Services à la personne",
  livraison: "Logistique",
  administratif: "Administratif",
  comptabilité: "Comptabilité / Finance",
  finance: "Comptabilité / Finance",
  rh: "Ressources humaines",
  "ressources humaines": "Ressources humaines",
};

function toNumber(s: string): number {
  return parseInt(s.replace(/\s/g, ""), 10);
}

export function parseNaturalLanguageQuery(input: string): ParsedQuery {
  const text = input.trim();
  const lower = text.toLowerCase();
  const matchedRules: string[] = [];

  // --- Hours per week ("10 à 15 heures par semaine", "15h/semaine", "max 20h") ---
  let hoursPerWeekMin: number | null = null;
  let hoursPerWeekMax: number | null = null;

  const rangeHours = lower.match(
    /(\d{1,2})\s*(?:à|-)\s*(\d{1,2})\s*h(?:eures?)?\s*(?:\/|\bpar\b)?\s*semaine/
  );
  if (rangeHours) {
    hoursPerWeekMin = toNumber(rangeHours[1]);
    hoursPerWeekMax = toNumber(rangeHours[2]);
    matchedRules.push("hours_range");
  } else {
    const maxHours = lower.match(
      /(?:max(?:imum)?|au plus|jusqu'?[aà])\s*(\d{1,2})\s*h(?:eures?)?/
    );
    const singleHours = lower.match(/(\d{1,2})\s*h(?:eures?)?\s*(?:\/|\bpar\b)\s*semaine/);
    if (maxHours) {
      hoursPerWeekMax = toNumber(maxHours[1]);
      matchedRules.push("hours_max");
    } else if (singleHours) {
      hoursPerWeekMax = toNumber(singleHours[1]);
      matchedRules.push("hours_single");
    }
  }

  // --- Days of week ---
  const days: string[] = [];
  for (const [fr, code] of Object.entries(DAY_MAP)) {
    if (new RegExp(`\\b${fr}s?\\b`).test(lower)) {
      days.push(code);
    }
  }
  if (days.length) matchedRules.push("days");
  if (/week[- ]?end/.test(lower) && !days.includes("SAT") && !days.includes("SUN")) {
    days.push("SAT", "SUN");
    matchedRules.push("weekend_days");
  }

  // --- Time slots ---
  const slots: string[] = [];
  if (/\b(soir|soirée|soirs)\b/.test(lower)) slots.push("EVENING");
  if (/\bmatin(s)?\b/.test(lower)) slots.push("MORNING");
  if (/\baprès[- ]?midi\b/.test(lower)) slots.push("AFTERNOON");
  if (/\bnuit(s)?\b/.test(lower)) slots.push("NIGHT");
  if (/week[- ]?end/.test(lower)) slots.push("WEEKEND");
  if (slots.length) matchedRules.push("slots");

  // --- Distance / commute time ("moins de 30 minutes", "à 20 minutes à pied", "20 km", "20 minutes de chez moi") ---
  let maxDistanceKm: number | null = null;
  let maxCommuteMinutes: number | null = null;

  const kmMatch = lower.match(/(?:moins de\s*)?(\d{1,3})\s*km/);
  if (kmMatch) {
    maxDistanceKm = toNumber(kmMatch[1]);
    matchedRules.push("distance_km");
  }

  const minutesMatch = lower.match(
    /(?:moins de\s*|à\s*)?(\d{1,3})\s*min(?:utes?)?\s*(?:de chez moi|de trajet|à pied|en transport|en voiture)?/
  );
  if (minutesMatch) {
    maxCommuteMinutes = toNumber(minutesMatch[1]);
    // Rough conversion to a distance radius so the search engine's
    // distance filter can use it too (average urban commute ~25km/h).
    maxDistanceKm = maxDistanceKm ?? Math.round((maxCommuteMinutes / 60) * 25);
    matchedRules.push("commute_minutes");
  }

  // --- Salary ("au moins 800 € par mois", "minimum 1200€") ---
  let minSalaryMonthly: number | null = null;
  const salaryMatch = lower.match(
    /(?:au moins|minimum|min\.?)\s*(\d{3,5})\s*(?:€|euros?)(?:\s*(?:\/|\bpar\b)\s*mois)?/
  );
  if (salaryMatch) {
    minSalaryMonthly = toNumber(salaryMatch[1]);
    matchedRules.push("salary");
  }

  // --- Contract types ---
  const contractTypes: string[] = [];
  const contractPatterns: [RegExp, string][] = [
    [/\bcdi\b/, "CDI"],
    [/\bcdd\b/, "CDD"],
    [/\bstage\b|\bstagiaire\b/, "STAGE"],
    [/\balternance\b|\bapprentissage\b/, "ALTERNANCE"],
    [/\bint[eé]rim\b/, "INTERIM"],
    [/\bmission(s)?\b/, "MISSION"],
    [/\bfreelance\b|\bind[eé]pendant\b/, "FREELANCE"],
    [/\bsaisonnier\b|\bsaison\b/, "SAISONNIER"],
  ];
  for (const [re, code] of contractPatterns) {
    if (re.test(lower)) contractTypes.push(code);
  }
  if (contractTypes.length) matchedRules.push("contract_types");

  // --- Experience level ---
  let experienceLevel: "STUDENT" | "ENTRY" | null = null;
  if (/[ée]tudiant|job [ée]tudiant|alternant/.test(lower)) {
    experienceLevel = "STUDENT";
    matchedRules.push("experience_student");
  } else if (/sans exp[eé]rience|d[eé]butant/.test(lower)) {
    experienceLevel = "ENTRY";
    matchedRules.push("experience_entry");
  }

  // --- Remote preference ---
  let remotePreference: "REMOTE_ONLY" | "HYBRID" | null = null;
  if (/t[eé]l[eé]travail (?:complet|total|100)|full remote|remote uniquement/.test(lower)) {
    remotePreference = "REMOTE_ONLY";
    matchedRules.push("remote_full");
  } else if (/hybride|t[eé]l[eé]travail partiel/.test(lower)) {
    remotePreference = "HYBRID";
    matchedRules.push("remote_hybrid");
  }

  // --- Sectors ---
  const sectors = new Set<string>();
  for (const [kw, label] of Object.entries(SECTOR_KEYWORDS)) {
    if (new RegExp(`\\b${kw}\\b`).test(lower)) sectors.add(label);
  }
  if (sectors.size) matchedRules.push("sectors");

  // --- Free-text keywords for lexical fallback search (nouns-ish tokens) ---
  const STOPWORDS = new Set(
    "je suis un une des de du au aux et ou en dans par pour avec sur sans sous le la les ce cet cette ces mon ma mes ton ta tes son sa ses qui que quoi dont où travailler peux cherche cherche recherche quelque chose moins plus principalement chez moi veux voudrais trouve trouver".split(
      /\s+/
    )
  );
  const keywords = Array.from(
    new Set(
      lower
        .replace(/[^a-zàâäéèêëïîôöùûüç0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !STOPWORDS.has(w))
    )
  ).slice(0, 12);

  return {
    hoursPerWeekMin,
    hoursPerWeekMax,
    days,
    slots,
    maxDistanceKm,
    maxCommuteMinutes,
    minSalaryMonthly,
    contractTypes,
    experienceLevel,
    sectors: Array.from(sectors),
    remotePreference,
    keywords,
    freeText: text,
    matchedRules,
  };
}
