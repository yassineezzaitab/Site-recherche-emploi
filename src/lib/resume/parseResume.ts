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

/**
 * JavaScript's \b only treats [A-Za-z0-9_] as "word" characters — it does
 * NOT recognize accented Unicode letters (é, à, ï...). That means
 * /\bbut\b/i "matches a boundary" right in the middle of "débutant" (dé|but|ant):
 * é isn't a word character to \b, so it looks like "but" starts a fresh
 * word. On French CV text this is a real, silent source of false-positive
 * keyword matches (a degree keyword firing on "débutant", a skill alias
 * firing inside an unrelated accented word). \p{L}/\p{N} with the /u flag
 * fixes this by treating every Unicode letter/digit as a word character.
 */
function wordBoundaryRegex(alternatives: string[], flags = "i"): RegExp {
  const body = alternatives.map((alt) => `(?<![\\p{L}\\p{N}])(?:${alt})(?![\\p{L}\\p{N}])`).join("|");
  return new RegExp(body, flags.includes("u") ? flags : `${flags}u`);
}

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

export interface ExtractedLink {
  label: string; // "LinkedIn" | "GitHub" | "Portfolio" | the raw domain otherwise
  url: string;
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
  interests: string[];
  links: ExtractedLink[];
  suggestedTitles: string[];
  warnings: string[];
}

const SECTION_HEADERS: Record<string, RegExp> = {
  experience:
    /^(exp[eé]riences?( professionnelles?)?|parcours professionnel|emplois?|stages?)\s*(et stages?)?\s*:?\s*$/i,
  education:
    /^(formations?( acad[eé]miques?| scolaires?)?|[eé]ducation|dipl[oô]mes?|parcours scolaire|parcours acad[eé]mique|cursus( scolaire)?|scolarit[eé])\s*:?\s*$/i,
  skills:
    /^(comp[eé]tences?( techniques?| et outils)?|savoir[- ]faire|outils( et technologies)?|technologies)\s*:?\s*$/i,
  languages: /^(langues?)\s*:?\s*$/i,
  certifications: /^(certifications?|certificats?)\s*:?\s*$/i,
  summary: /^(profil|[aà] propos|r[eé]sum[eé]|objectif)\s*:?\s*$/i,
  interests:
    /^(centres?\s*d['’]int[eé]r[eê]ts?|loisirs?|passions?|activit[eé]s? extra[- ]scolaires?)\s*:?\s*$/i,
  // Recognized and routed to its own (unprocessed) bucket specifically so
  // its content — day names, times, "vacances scolaires" — never gets
  // silently absorbed into whichever real section preceded it.
  ignored: /^(disponibilit[eé]s?|contact|coordonn[eé]es?)\s*:?\s*$/i,
};

// Modern CV templates commonly prefix section titles with an icon/emoji or
// a bullet ("🎓 Formation", "• Compétences") — stripped before matching so
// those headers aren't missed and their content silently dumped into
// whatever section came before (the main cause of "a formation ends up
// under Compétences": the section boundary itself was never detected).
function stripLeadingDecoration(line: string): string {
  return line.replace(/^[^\p{L}0-9]+/u, "").trim();
}

// A true section header is short — a full sentence that happens to start
// with a keyword (e.g. "Formation continue chez..." as prose) must never
// be swallowed as a header, since matched header lines are dropped rather
// than kept as content.
const MAX_HEADER_LENGTH = 45;

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
    if (line.length <= MAX_HEADER_LENGTH) {
      const candidate = stripLeadingDecoration(line);
      for (const [key, re] of Object.entries(SECTION_HEADERS)) {
        if (re.test(candidate)) {
          current = key;
          if (!sections.has(current)) sections.set(current, []);
          matched = true;
          break;
        }
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

  // Heuristic: the candidate's name is a short (1-4 word), capitalized
  // line that isn't a section header/headline and doesn't contain digits.
  // Common CV headlines ("Job étudiant", "À la recherche d'une
  // alternance"...) would otherwise pass the same shape test, so they're
  // explicitly excluded.
  const HEADLINE_WORDS = /\b(job|[ée]tudiant|recherche|profil|objectif|candidat|alternance|stage|cv)\b/i;

  // Column-reconstructed text can glue two unrelated same-row items
  // together with no space between them ("Yassine Ez-zaïtabCOMPETENCES" —
  // the name and the next column's section header, both on the same
  // visual row of the original PDF). A real name is Title Case, never
  // ALL CAPS, so a trailing all-caps run of 4+ letters glued onto an
  // otherwise Title Case line is reliably the next thing, not part of it.
  function stripGluedUppercaseSuffix(line: string): string {
    return line.replace(/\p{Lu}{4,}$/u, "").trim();
  }

  function looksLikeName(rawLine: string): string | null {
    const line = stripGluedUppercaseSuffix(rawLine);
    if (!line || line.includes("@") || /\d/.test(line)) return null;
    const words = line.split(/\s+/);
    if (words.length < 1 || words.length > 4) return null;
    if (!/^[A-ZÀ-Ý]/.test(line)) return null;
    if (HEADLINE_WORDS.test(line)) return null;
    return line;
  }

  const allLines = text.split("\n").map((l) => l.trim());
  let fullName: string | null = null;

  // Prefer a name found near the phone/email — virtually every CV layout
  // groups contact details together, which is a much stronger signal than
  // "somewhere in the first few lines" once a layout isn't simple top-to-
  // bottom (a multi-column CV can easily put a headline, not the name,
  // first in extracted-text order).
  const anchorMatch = phoneMatch ?? emailMatch;
  if (anchorMatch) {
    const anchorLine = allLines.findIndex((l) => l.includes(anchorMatch[0]));
    if (anchorLine !== -1) {
      const windowStart = Math.max(0, anchorLine - 4);
      const windowEnd = Math.min(allLines.length, anchorLine + 4);
      for (let i = windowStart; i < windowEnd; i++) {
        const candidate = looksLikeName(allLines[i]);
        if (candidate) {
          fullName = candidate;
          break;
        }
      }
    }
  }

  if (!fullName) {
    for (const line of allLines.slice(0, 8)) {
      const candidate = looksLikeName(line);
      if (candidate) {
        fullName = candidate;
        break;
      }
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
      const re = new RegExp(`(?<![\\p{L}\\p{N}])${alias}(?![\\p{L}\\p{N}])`, "iu");
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
        const re = new RegExp(`(?<![\\p{L}\\p{N}])${alias}(?![\\p{L}\\p{N}])`, "iu");
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

// Built by hand rather than via wordBoundaryRegex: every alternative here
// needs a trailing boundary check EXCEPT "bac", which must be allowed to
// continue into more letters ("baccalauréat") or "+2" ("bac+2") — a
// uniform trailing (?!\p{L}\p{N}) after "bac" itself would reject
// "baccalauréat" outright. The leading boundary is still shared and only
// needs stating once, ahead of the whole group.
const DEGREE_KEYWORDS_RE = new RegExp(
  "(?<![\\p{L}\\p{N}])(?:" +
    [
      String.raw`bac(?:c|\+\s*\d|(?![\p{L}\p{N}]))`, // bac, bac+2, baccalauréat
      "bts",
      "but",
      "dut",
      "bt",
      "licence",
      "master",
      String.raw`ing[eé]nieur`,
      "mba",
      "doctorat",
      "cap",
      "bep",
      "deug",
      String.raw`classe pr[eé]paratoire`,
      "brevet",
    ]
      .map((alt, i) => (i === 0 ? alt : `${alt}(?![\\p{L}\\p{N}])`))
      .join("|") +
    ")",
  "iu"
);
const INSTITUTION_KEYWORDS_RE = wordBoundaryRegex([
  String.raw`lyc[eé]e`,
  String.raw`universit[eé]`,
  "iut",
  String.raw`[eé]cole`,
  "institut",
  String.raw`coll[eè]ge`,
  String.raw`facult[eé]`,
]);
const CONTRACT_KEYWORDS_RE =
  /\b(int[eé]rim|cdi|cdd|stage|saisonnier|b[eé]n[eé]vole|alternance|apprentissage|freelance)\b/i;
const YEAR_RE = /\b(20\d{2})\b/;

/**
 * Content-signature scan across the WHOLE document, independent of which
 * section header (if any) precedes a line.
 *
 * Why not scope to the "Formation"/"Expériences" sections like the rest of
 * this file: a real-world multi-column CV layout (sidebar of labels next
 * to a wide content column, common in modern templates) gets its section
 * headers and their content pulled apart by any linear text extraction —
 * pdf.js/pdf-parse read text by vertical position, so a header in a left
 * rail ends up glued to unrelated text from the main column on the same
 * visual row, and by the time a "Formation" heading is encountered in the
 * byte stream it may already be several unrelated headings away from the
 * degree text it actually labels. A stateful "current section" pointer
 * then attributes real formation content to whatever section happened to
 * be last matched — e.g. an availability line ("Vendredi 17h30") ending
 * up filed as an education entry, or a genuine diploma ending up under
 * "Centres d'intérêt". Scanning for the content's own signature (a degree
 * keyword, a job-title/contract-type pattern) sidesteps that entirely: it
 * doesn't matter what order headers appear in, or whether they were
 * detected at all.
 */
function extractEducationsFromText(fullText: string): ExtractedEducation[] {
  const lines = fullText.split("\n").map((l) => l.trim());
  const entries: ExtractedEducation[] = [];
  const MAX_BLOCK_LINES = 5;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !DEGREE_KEYWORDS_RE.test(line)) continue;

    const block: string[] = [line];
    let j = i + 1;
    while (j < lines.length && block.length < MAX_BLOCK_LINES) {
      const next = lines[j];
      if (!next) break;
      if (DEGREE_KEYWORDS_RE.test(next)) break; // next education entry starts
      if (isExperienceStart(next)) break; // don't swallow into a following job entry
      block.push(next);
      j++;
      // Stop as soon as the block looks complete (mentions an institution
      // somewhere in it, and just added a line ending in a French-postal-
      // code-style suffix, e.g. "... (69).") rather than greedily
      // consuming further lines up to the cap — the block otherwise runs
      // straight into the next section's content (skills, languages...)
      // on CVs where paragraph breaks didn't survive text extraction. The
      // institution name itself can span more than one physical line
      // ("...Lycée Charles et\nAdrien du Puy, Le Puy-en-Velay (43)"), so
      // that check looks at the whole block collected so far, not just
      // the line that was just added.
      if (INSTITUTION_KEYWORDS_RE.test(block.join(" ")) && /\(\d{2,3}\)\.?\s*$/.test(next)) break;
    }
    i = j - 1;

    const blockText = block.join(" ");
    const instMatch = blockText.match(INSTITUTION_KEYWORDS_RE);
    let degree: string;
    let institution: string | null;
    if (instMatch && instMatch.index !== undefined) {
      degree = blockText.slice(0, instMatch.index).replace(/[,/]\s*$/, "").trim();
      institution = blockText.slice(instMatch.index).replace(/\.\s*$/, "").trim();
    } else {
      // "<degree> / <institution>" — the other common separator in practice.
      const slashSplit = blockText.split(/\s*\/\s*/);
      if (slashSplit.length >= 2) {
        degree = slashSplit[0].trim();
        institution = slashSplit.slice(1).join(" / ").trim();
      } else {
        degree = blockText.trim();
        institution = null;
      }
    }

    const dateMatch = blockText.match(DATE_RANGE_RE);
    const yearMatch = !dateMatch ? blockText.match(YEAR_RE) : null;
    const isCurrent = dateMatch ? /pr[eé]sent|aujourd'?hui|en cours/i.test(dateMatch[2]) : false;

    entries.push({
      // Never invented: if no institution keyword or "/" separator was
      // found, we genuinely don't know it — leave it null rather than
      // reuse the degree text or guess.
      institution: institution || "Non précisé",
      degree: degree || null,
      dateRange: dateMatch ? dateMatch[0] : yearMatch ? yearMatch[0] : null,
      startDate: dateMatch
        ? parseFrenchDateFragment(dateMatch[1])
        : yearMatch
          ? parseFrenchDateFragment(yearMatch[1])
          : null,
      endDate: dateMatch && !isCurrent ? parseFrenchDateFragment(dateMatch[2]) : null,
    });
  }
  return entries;
}

// The real, reliable "a job entry starts here" signal in practice: a short
// title (a handful of words, starting with a capital letter) followed by
// an em-dash or en-dash, then a capitalized company/location. Deliberately
// NOT a plain hyphen — French job titles are full of hyphenated compounds
// ("Co-animateur", "maître-nageur") that would otherwise get split in the
// middle of a single word. Also deliberately NOT "any line with a date
// range" (an earlier version of this function used that, and it caused a
// bare formation date like "2022 — En cours" to be misread as a job
// entry) — a date-only fragment never has a capital letter on both sides
// of the dash the way an actual "Title — Company" line does.
const DAY_MONTH_RE =
  /\b\d{1,2}\s*(janv|f[eé]vr|mars|avr|mai|juin|juil|ao[uû]t|sept|oct|nov|d[eé]c)/i;

function matchTitleDashCompany(line: string): { title: string; rest: string } | null {
  const m = line.match(/([\p{Lu}][\p{L}0-9'’.() /-]{1,45}?)\s*(?:[—–]|\s-\s)\s*([\p{Lu}].+)$/u);
  if (!m) return null;
  const title = m[1].trim();
  if (DATE_RANGE_RE.test(title) || YEAR_RE.test(title)) return null;
  const wordCount = title.split(/\s+/).filter(Boolean).length;
  if (wordCount === 0 || wordCount > 6) return null;
  // A title/company dash and a plain enumeration dash ("Activité A – détail
  // – détail") look identical by shape alone. What distinguishes an actual
  // job entry across every case seen in practice: a contract-type word
  // (intérim, CDI...) or a day+month date somewhere on that same line —
  // an interest/summary line enumerating things with dashes has neither.
  if (!CONTRACT_KEYWORDS_RE.test(line) && !DAY_MONTH_RE.test(line)) return null;
  return { title, rest: m[2].trim() };
}

function isExperienceStart(line: string): boolean {
  return matchTitleDashCompany(line) !== null;
}

function extractExperiencesFromText(fullText: string): ExtractedExperience[] {
  const lines = fullText.split("\n").map((l) => l.trim());
  const entries: ExtractedExperience[] = [];
  const MAX_BLOCK_LINES = 10;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !isExperienceStart(line)) continue;

    const block: string[] = [line];
    let j = i + 1;
    while (j < lines.length && block.length < MAX_BLOCK_LINES) {
      const next = lines[j];
      if (!next) break;
      if (isExperienceStart(next)) break; // next job entry starts
      if (DEGREE_KEYWORDS_RE.test(next)) break; // don't swallow into an education entry
      block.push(next);
      j++;
    }
    i = j - 1;

    const match = matchTitleDashCompany(line);
    // isExperienceStart already checked this line matches, so match is
    // non-null here — the "!" documents that invariant rather than
    // silencing a real possibility of null.
    const title = (match!.title.replace(/\(\s*[^)]*\)\s*$/, "").trim()) || "Poste";
    const companyLine = match!.rest;

    const bodyLines = block.slice(1);
    const bulletLines = bodyLines.filter((l) => /^[•*-]\s?/.test(l));
    const nonBulletLines = bodyLines.filter((l) => !/^[•*-]\s?/.test(l) && !DATE_RANGE_RE.test(l) && !YEAR_RE.test(l));
    const company = (companyLine || nonBulletLines[0] || "").replace(/\(\d+.*$/, "").trim();
    const description = bulletLines.map((l) => l.replace(/^[•*-]\s?/, "").trim()).join(" ; ");

    const blockText = block.join(" ");
    const dateMatch = blockText.match(DATE_RANGE_RE);
    const yearMatch = !dateMatch ? blockText.match(YEAR_RE) : null;
    const isCurrent = dateMatch ? /pr[eé]sent|aujourd'?hui|en cours/i.test(dateMatch[2]) : false;

    entries.push({
      company: company || "Non précisée",
      title: title.replace(/[-–—]+$/, "").trim(),
      dateRange: dateMatch ? dateMatch[0] : yearMatch ? yearMatch[0] : null,
      startDate: dateMatch
        ? parseFrenchDateFragment(dateMatch[1])
        : yearMatch
          ? parseFrenchDateFragment(yearMatch[1])
          : null,
      endDate: dateMatch && !isCurrent ? parseFrenchDateFragment(dateMatch[2]) : null,
      isCurrent,
      description,
    });
  }
  return entries;
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
  const degreeKeywords = DEGREE_KEYWORDS_RE;

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

function extractInterests(sectionText: string): string[] {
  if (!sectionText.trim()) return [];
  // Interests are usually a comma/bullet-separated list rather than one
  // per line, so split on common separators, not just newlines.
  const items = sectionText
    .split(/[\n,;•·]/)
    .map((s) => s.trim().replace(/^[-–—*]\s*/, ""))
    .filter((s) => s.length > 1 && s.length < 60);
  const deduped = Array.from(new Set(items));
  // Section-header detection can still misfire on a badly-scrambled
  // multi-column layout and silently accumulate the rest of the document
  // under "interests" — a real 3-6 item hobby list producing 20+ entries
  // is a strong sign of exactly that, not a strong sign this is a CV with
  // dozens of listed hobbies. Discarding the whole (unreliable) batch
  // follows the same rule this module applies everywhere else: better to
  // show nothing than to show data that's actually mislabeled.
  return deduped.length > 15 ? [] : deduped;
}

const LINK_PATTERNS: { label: string; re: RegExp }[] = [
  { label: "LinkedIn", re: /https?:\/\/(www\.)?linkedin\.com\/[^\s,;)]+/i },
  { label: "GitHub", re: /https?:\/\/(www\.)?github\.com\/[^\s,;)]+/i },
  { label: "Portfolio", re: /https?:\/\/[^\s,;)]*portfolio[^\s,;)]*/i },
];

function extractLinks(fullText: string): ExtractedLink[] {
  const found: ExtractedLink[] = [];
  const seen = new Set<string>();
  for (const { label, re } of LINK_PATTERNS) {
    const match = fullText.match(re);
    if (match && !seen.has(match[0])) {
      seen.add(match[0]);
      found.push({ label, url: match[0].replace(/[.,]+$/, "") });
    }
  }
  return found;
}

/** Drops entries that are exact duplicates once whitespace/case is normalized. */
function dedupeBy<T>(items: T[], keyOf: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const key = keyOf(item).toLowerCase().replace(/\s+/g, " ").trim();
    if (key && !seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
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
  // Content-signature scan of the full document is the primary path (see
  // extractExperiencesFromText's doc comment for why: section headers and
  // their content can end up out of order once a multi-column PDF layout
  // is linearized). Section-scoped extraction is a fallback for the case
  // where neither a degree keyword nor a job-title/contract pattern was
  // found anywhere — better than nothing for a CV this heuristic can't read.
  const experiencesFromContent = extractExperiencesFromText(rawText);
  const experiences = dedupeBy(
    experiencesFromContent.length > 0
      ? experiencesFromContent
      : extractExperiences((sections.get("experience") ?? []).join("\n")),
    (e) => `${e.title}@${e.company}`
  );
  const educationsFromContent = extractEducationsFromText(rawText);
  const educations = dedupeBy(
    educationsFromContent.length > 0
      ? educationsFromContent
      : extractEducations((sections.get("education") ?? []).join("\n")),
    (e) => `${e.degree ?? ""}@${e.institution}`
  );
  const languages = extractLanguages((sections.get("languages") ?? []).join("\n"), rawText);
  const certifications = extractCertifications((sections.get("certifications") ?? []).join("\n"));
  const interests = extractInterests((sections.get("interests") ?? []).join("\n"));
  const links = extractLinks(rawText);

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
    interests,
    links,
    suggestedTitles: suggestTitles(experiences),
    warnings,
  };
}
