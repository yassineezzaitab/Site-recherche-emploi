import {
  SKILLS,
  LANGUAGE_NAMES,
  LANGUAGE_LEVEL_PATTERNS,
} from "./skillsDictionary";

/**
 * Deterministic CV analyzer.
 *
 * Design principle (see task spec §3): NEVER invent an experience, degree,
 * or skill. Every extracted item must be traceable to a literal substring
 * match in the CV text. This module purely detects and structures what is
 * already written — it does not infer, guess, or embellish. Everything it
 * returns is presented to the user as an editable draft, never saved
 * silently as fact.
 */

export interface ExtractedSkill {
  name: string;
  category: string;
  evidence: string; // the literal text snippet that triggered the match
}

export interface ExtractedExperience {
  company: string;
  title: string;
  dateRange: string | null;
  startDate: string | null; // ISO date, best-effort
  endDate: string | null;
  isCurrent: boolean;
  description: string;
}

export interface ExtractedEducation {
  institution: string;
  degree: string | null;
  dateRange: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface ExtractedLanguage {
  name: string;
  level: string | null;
}

export interface ExtractedCertification {
  name: string;
  issuer: string | null;
}

export interface ResumeExtraction {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  skills: ExtractedSkill[];
  experiences: ExtractedExperience[];
  educations: ExtractedEducation[];
  languages: ExtractedLanguage[];
  certifications: ExtractedCertification[];
  suggestedTitles: string[];
  warnings: string[];
}

const SECTION_HEADERS: Record<string, RegExp> = {
  experience:
    /^(exp[eé]riences?( professionnelles?)?|parcours professionnel|emplois?)\s*:?\s*$/i,
  education:
    /^(formations?|[eé]ducation|dipl[oô]mes?|parcours scolaire|parcours acad[eé]mique)\s*:?\s*$/i,
  skills: /^(comp[eé]tences?( techniques?)?|savoir[- ]faire)\s*:?\s*$/i,
  languages: /^(langues?)\s*:?\s*$/i,
  certifications: /^(certifications?|certificats?)\s*:?\s*$/i,
  summary: /^(profil|[aà] propos|r[eé]sum[eé]|objectif)\s*:?\s*$/i,
};

const MONTHS: Record<string, number> = {
  janvier: 1, jan: 1, février: 2, fevrier: 2, fev: 2, mars: 3,
  avril: 4, avr: 4, mai: 5, juin: 6, juillet: 7, juil: 7,
  août: 8, aout: 8, septembre: 9, sept: 9, octobre: 10, oct: 10,
  novembre: 11, nov: 11, décembre: 12, decembre: 12, dec: 12,
};

const DATE_RANGE_RE =
  /((?:[a-zéû]+\.?\s+)?\d{4}|\d{2}\/\d{4})\s*(?:-|–|—|à|au)\s*((?:[a-zéû]+\.?\s+)?\d{4}|\d{2}\/\d{4}|pr[eé]sent|aujourd'?hui|en cours)/i;

function parseFrenchDateFragment(fragment: string): string | null {
  const f = fragment.trim().toLowerCase();
  if (/pr[eé]sent|aujourd'?hui|en cours/.test(f)) return null;

  const slash = f.match(/^(\d{1,2})\/(\d{4})$/);
  if (slash) {
    return `${slash[2]}-${slash[1].padStart(2, "0")}-01`;
  }

  const withMonth = f.match(/^([a-zéû]+)\.?\s+(\d{4})$/);
  if (withMonth) {
    const monthKey = withMonth[1].replace(".", "");
    const month = MONTHS[monthKey];
    if (month) return `${withMonth[2]}-${String(month).padStart(2, "0")}-01`;
  }

  const yearOnly = f.match(/^(\d{4})$/);
  if (yearOnly) return `${yearOnly[1]}-01-01`;

  return null;
}

function splitIntoSections(text: string): Map<string, string[]> {
  const lines = text.split("\n").map((l) => l.trim());
  const sections = new Map<string, string[]>();
  let current = "other";
  sections.set(current, []);

  for (const line of lines) {
    if (!line) {
      // Preserve blank lines as paragraph separators within a section —
      // they're the strongest signal for where one CV entry ends and the
      // next begins.
      sections.get(current)!.push("");
      continue;
    }
    let matched = false;
    for (const [key, re] of Object.entries(SECTION_HEADERS)) {
      if (re.test(line)) {
        current = key;
        if (!sections.has(current)) sections.set(current, []);
        matched = true;
        break;
      }
    }
    if (!matched) {
      sections.get(current)!.push(line);
    }
  }
  return sections;
}

function extractContact(text: string) {
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = text.match(
    /(?:\+33|0)\s?[1-9](?:[\s.-]?\d{2}){4}/
  );

  // Heuristic: the candidate's name is usually the first non-empty line
  // that isn't the email/phone and doesn't look like a section header or a
  // sentence (no more than 4 words, starts with a capital letter).
  const firstLines = text.split("\n").slice(0, 8);
  let fullName: string | null = null;
  for (const raw of firstLines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.includes("@") || /\d{2,}/.test(line)) continue;
    const words = line.split(/\s+/);
    if (words.length >= 1 && words.length <= 4 && /^[A-ZÀ-Ý]/.test(line)) {
      fullName = line;
      break;
    }
  }

  return {
    email: emailMatch?.[0] ?? null,
    phone: phoneMatch?.[0]?.replace(/[\s.-]/g, " ").trim() ?? null,
    fullName,
  };
}

function extractCity(text: string): string | null {
  // Look for a French postcode (5 digits) followed by / preceded by a city name.
  const match = text.match(/\b(\d{5})\s+([A-ZÀ-Ý][a-zà-ÿ'-]+(?:[\s-][A-ZÀ-Ý][a-zà-ÿ'-]+)*)/);
  if (match) return match[2];
  const reverse = text.match(/\b([A-ZÀ-Ý][a-zà-ÿ'-]+(?:[\s-][A-ZÀ-Ý][a-zà-ÿ'-]+)*)\s*,?\s*(\d{5})\b/);
  if (reverse) return reverse[1];
  return null;
}

function extractSkills(fullText: string): ExtractedSkill[] {
  const found: ExtractedSkill[] = [];
  const seen = new Set<string>();

  for (const def of SKILLS) {
    for (const alias of def.aliases) {
      const re = new RegExp(`(?<![\\w])${alias}(?![\\w])`, "i");
      const match = fullText.match(re);
      if (match && !seen.has(def.canonical)) {
        seen.add(def.canonical);
        found.push({
          name: def.canonical,
          category: def.category,
          evidence: match[0],
        });
        break;
      }
    }
  }
  return found;
}

function extractLanguages(languageSectionText: string, fullText: string): ExtractedLanguage[] {
  const results: ExtractedLanguage[] = [];
  const searchText = languageSectionText || fullText;
  const lines = searchText.split("\n").filter(Boolean);
  const seen = new Set<string>();

  const scan = (haystack: string) => {
    for (const lang of LANGUAGE_NAMES) {
      if (seen.has(lang.canonical)) continue;
      for (const alias of lang.aliases) {
        const re = new RegExp(`(?<![\\w])${alias}(?![\\w])`, "i");
        if (re.test(haystack)) {
          // Look for a level near the language mention (same line ideally).
          const lineWithLang = haystack
            .split("\n")
            .find((l) => re.test(l)) ?? haystack;
          let level: string | null = null;
          for (const lp of LANGUAGE_LEVEL_PATTERNS) {
            if (lp.regex.test(lineWithLang)) {
              level = lp.level;
              break;
            }
          }
          seen.add(lang.canonical);
          results.push({ name: lang.canonical, level });
          break;
        }
      }
    }
  };

  scan(lines.join("\n"));
  return results;
}

function extractCertifications(sectionText: string): ExtractedCertification[] {
  if (!sectionText) return [];
  return sectionText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 2)
    .map((line) => {
      // "Certification Name - Issuer" or "Certification Name (Issuer)"
      const dashSplit = line.split(/\s+-\s+|\s+–\s+/);
      const parenMatch = line.match(/^(.+?)\s*\(([^)]+)\)$/);
      if (parenMatch) {
        return { name: parenMatch[1].trim(), issuer: parenMatch[2].trim() };
      }
      if (dashSplit.length === 2) {
        return { name: dashSplit[0].trim(), issuer: dashSplit[1].trim() };
      }
      return { name: line, issuer: null };
    });
}

function extractExperiences(sectionText: string): ExtractedExperience[] {
  if (!sectionText) return [];
  const blocks = splitIntoEntryBlocks(sectionText);
  return blocks.map((block) => {
    const lines = block.split("\n").filter(Boolean);
    const headerLine = lines[0] ?? "";
    const dateMatch = headerLine.match(DATE_RANGE_RE) ?? block.match(DATE_RANGE_RE);

    let title = headerLine;
    let company = "";
    const headerWithoutDate = headerLine.replace(DATE_RANGE_RE, "").trim();
    const sepMatch = headerWithoutDate.match(/^(.+?)\s*[-–—@|]\s*(.+)$/);
    if (sepMatch) {
      title = sepMatch[1].trim();
      company = sepMatch[2].trim();
    } else {
      // Second line is often the company when no separator is present.
      title = headerWithoutDate || lines[0] || "Poste";
      company = lines[1] && !DATE_RANGE_RE.test(lines[1]) ? lines[1].trim() : "";
    }

    const description = lines.slice(company ? 2 : 1).join(" ").trim();
    const isCurrent = dateMatch ? /pr[eé]sent|aujourd'?hui|en cours/i.test(dateMatch[2]) : false;

    return {
      company: company || "Entreprise non précisée",
      title: title.replace(/[-–—]+$/, "").trim(),
      dateRange: dateMatch ? dateMatch[0] : null,
      startDate: dateMatch ? parseFrenchDateFragment(dateMatch[1]) : null,
      endDate: dateMatch && !isCurrent ? parseFrenchDateFragment(dateMatch[2]) : null,
      isCurrent,
      description,
    };
  });
}

function extractEducations(sectionText: string): ExtractedEducation[] {
  if (!sectionText) return [];
  const blocks = splitIntoEntryBlocks(sectionText);
  const degreeKeywords =
    /(bac(?:\s*\+\s*\d)?|bts|dut|licence|master|ing[eé]nieur|mba|doctorat|cap|bep|deug|classe pr[eé]paratoire)/i;

  return blocks.map((block) => {
    const lines = block.split("\n").filter(Boolean);
    const headerLine = lines[0] ?? "";
    const dateMatch = block.match(DATE_RANGE_RE);
    const headerWithoutDate = headerLine.replace(DATE_RANGE_RE, "").trim();

    const sepMatch = headerWithoutDate.match(/^(.+?)\s*[-–—@|]\s*(.+)$/);
    let degree: string | null = null;
    let institution = headerWithoutDate;

    if (sepMatch) {
      const [a, b] = [sepMatch[1].trim(), sepMatch[2].trim()];
      if (degreeKeywords.test(a)) {
        degree = a;
        institution = b;
      } else {
        institution = a;
        degree = degreeKeywords.test(b) ? b : null;
      }
    } else if (degreeKeywords.test(headerWithoutDate)) {
      degree = headerWithoutDate;
      institution = lines[1] && !DATE_RANGE_RE.test(lines[1] ?? "") ? lines[1].trim() : headerWithoutDate;
    }

    const isCurrent = dateMatch ? /pr[eé]sent|aujourd'?hui|en cours/i.test(dateMatch[2]) : false;

    return {
      institution: institution || "Établissement non précisé",
      degree,
      dateRange: dateMatch ? dateMatch[0] : null,
      startDate: dateMatch ? parseFrenchDateFragment(dateMatch[1]) : null,
      endDate: dateMatch && !isCurrent ? parseFrenchDateFragment(dateMatch[2]) : null,
    };
  });
}

/**
 * Groups a section's lines into per-entry blocks.
 *
 * Primary strategy: split on blank-line paragraph breaks, which is how most
 * CVs visually separate entries and survives text extraction from
 * PDF/DOCX reasonably well. If the whole section came through as one single
 * paragraph (no blank lines at all — common with poorly-spaced PDF
 * extraction), fall back to a heuristic split on lines that look like the
 * start of a new entry (contain a date range, or a new capitalized line
 * following an already-dated block).
 */
function splitIntoEntryBlocks(sectionText: string): string[] {
  const paragraphs = sectionText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length > 1) return paragraphs;

  const lines = sectionText.split("\n").filter((l) => l.trim());
  const blocks: string[] = [];
  let current: string[] = [];
  let currentHasDate = false;

  for (const line of lines) {
    const lineHasDate = DATE_RANGE_RE.test(line);
    const looksLikeNewEntry =
      current.length > 0 && currentHasDate && /^[A-ZÀ-Ý0-9]/.test(line) && !lineHasDate;
    if (looksLikeNewEntry) {
      blocks.push(current.join("\n"));
      current = [line];
      currentHasDate = false;
    } else {
      current.push(line);
      if (lineHasDate) currentHasDate = true;
    }
  }
  if (current.length) blocks.push(current.join("\n"));
  return blocks.filter((b) => b.trim().length > 0);
}

function suggestTitles(experiences: ExtractedExperience[]): string[] {
  const titles = experiences.map((e) => e.title).filter(Boolean);
  return Array.from(new Set(titles)).slice(0, 5);
}

export function parseResume(rawText: string): ResumeExtraction {
  const warnings: string[] = [];
  if (rawText.trim().length < 50) {
    warnings.push(
      "Le texte extrait est très court : le CV est peut-être une image scannée, l'analyse automatique sera limitée."
    );
  }

  const sections = splitIntoSections(rawText);
  const contact = extractContact(rawText);
  const city = extractCity(rawText);

  const skills = extractSkills(rawText);
  const experiences = extractExperiences((sections.get("experience") ?? []).join("\n"));
  const educations = extractEducations((sections.get("education") ?? []).join("\n"));
  const languages = extractLanguages((sections.get("languages") ?? []).join("\n"), rawText);
  const certifications = extractCertifications((sections.get("certifications") ?? []).join("\n"));

  if (experiences.length === 0) {
    warnings.push("Aucune expérience professionnelle détectée automatiquement — vous pouvez les ajouter manuellement.");
  }
  if (educations.length === 0) {
    warnings.push("Aucune formation détectée automatiquement — vous pouvez les ajouter manuellement.");
  }
  if (skills.length === 0) {
    warnings.push("Aucune compétence reconnue dans notre référentiel — ajoutez-les manuellement pour améliorer vos correspondances.");
  }

  return {
    fullName: contact.fullName,
    email: contact.email,
    phone: contact.phone,
    city,
    skills,
    experiences,
    educations,
    languages,
    certifications,
    suggestedTitles: suggestTitles(experiences),
    warnings,
  };
}
