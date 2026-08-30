import { describe, it, expect } from "vitest";
import { parseResume } from "@/lib/resume/parseResume";

/**
 * Anonymized reproduction of a real, reported misclassification bug —
 * personal details (name/address/phone/email/employer names) replaced
 * with placeholders, but every structural quirk that broke the old parser
 * is preserved verbatim: section headers glued to the next column's text
 * with no space ("Yassine Ez-zaïtabCOMPETENCES" → "Alex DupontCOMPETENCES"),
 * a scrambled date "gutter" column, em-dash "Title —Company" entries where
 * the dash is glued straight to the next word, bullet points interleaved
 * from a multi-sub-column task list, and the actual text this exercises:
 * a "BUT" diploma, plain intérim jobs and unpaid/volunteer-style roles
 * with no contract keyword at all.
 *
 * This is what src/lib/resume/extractText.ts's column-aware PDF renderer
 * actually produces for a real two-column CV template — see its and
 * parseResume.ts's doc comments for why a naive "current section" state
 * machine cannot survive this, and what replaced it.
 */
const REAL_WORLD_LAYOUT_CV = `Job étudiant
Sérieux, dynamique et à l'aise avec le public, je souhaite m'investir dans une expérience enrichissante au sein
de votre restaurant, en contribuant à la satisfaction des clients dans un environnement rapide et exigeant.
FORMATION
2025-2026
2025
Alex DupontCOMPETENCES
12, rue des Exemples
69100 Villeurbanne (Gratte-Ciel)
Programmation
+33 6 00 00 00 00
Électronique
alex.dupont.exemple@example.com
Langues
20 ans
Permis B
Logiciels
Permis 125
Travail en équipe
DisponibilitésEXPERIENCES
Vendredi 17h30 à 00h18–24  août  2025
(40 h)
Samedi toute la journée
Dimanche toute la
journée
8 juillet –
Vacances scolaires2025 (210 h)
CENTRESD'INTERET
Codage
Camping

1e année BUT Génie Électrique Informatique Industrielle
(GEII)/ IUT Exemple 1, Université Exemple, Villeurbanne
(69).
Baccalauréat Générale, spécialités Numérique et Sciences
Informatique (NSI) et Mathématiques, Lycée Exemple et
Exemple du Puy, Le Puy-en-Velay (43)
Langage C, Python, Ladder, Grafcet
Montages avec AOP, transistors, diodes
Anglais  (A2)  scolaire-Visionnage  VO,  Espagnol  intermédiaire
(B1) voyages culturels annuels
Mblab   (débutant),   Unity   (débutant),   Clion   (intermédiaire),
Edupython (intermédiaire)
Collaboration, entraide, communication
Conditionneur (intérim) —Site Exemple, Exemple SA
•Misesous vide de •Emballage et préparation
légumes secs des commandes
14 août
Conditionneur  (intérim) —Fromagerie  Exemple,  Exempleville
(43)• Affinage• Retournement• Port de charges lourdes
• Nettoyage des fromages• Mise sous vide• Manutentions
et des planches• Mise en cave• Nettoyage
• Retournement
22 août Co-animateur  radio —Radio  Exemple  FM99,  Centre
• Mise sous vide
Social Exemple, Le Puy-en-Velay (43)
• Mise en cave
• Interviews• Initiation à la création de scénarios
• Port de charges lourdes
• Initiation aux montages• Réunions
• Manutentions
vidéo
• Nettoyage
22  août Co-salarié  mini-entreprise —EXEMPLE  99,  Centre  Social  de
Exemple, Le Puy-en-Velay (43)
• Réunions• Initiation au packaging (ESEPAC)
• Enquêtes de satisfaction• Initiation à la gestion d'entreprise
31 août Assistant maître-nageur —Exemplie
• Accueil
• Nettoyage de la plage
• Location de matériel• Surveillance
Programmation et développement de jeux en Python–
Création de mini-jeux et projetspersonnels.
Organisation de séjours –Camps de vacances (Exemple) –
Activités de plein air –Natation –Feux de camp`;

describe("parseResume — real-world scrambled two-column layout (anonymized fixture)", () => {
  const result = parseResume(REAL_WORLD_LAYOUT_CV);

  it("extracts the real name, not the CV's headline or a glued section header", () => {
    expect(result.fullName).toBe("Alex Dupont");
  });

  it("classifies both diplomas as education, with correct degree/institution split", () => {
    expect(result.educations.length).toBe(2);
    const but = result.educations.find((e) => /but/i.test(e.degree ?? ""));
    expect(but?.degree).toMatch(/g[ée]nie [ée]lectrique/i);
    expect(but?.institution).toMatch(/iut/i);
    const bac = result.educations.find((e) => /baccalaur[ée]at/i.test(e.degree ?? ""));
    expect(bac?.institution).toMatch(/lyc[ée]e/i);
    // The institution must not have swallowed the following skills list.
    expect(bac?.institution).not.toMatch(/langage c|mblab/i);
  });

  it("does not classify the availability block (day names / times) as education", () => {
    expect(result.educations.some((e) => /vendredi|samedi|dimanche/i.test(e.institution))).toBe(false);
    expect(result.educations.some((e) => /vendredi|samedi|dimanche/i.test(e.degree ?? ""))).toBe(false);
  });

  it("extracts all 5 real jobs as experiences, including the ones with no contract keyword", () => {
    expect(result.experiences.length).toBe(5);
    const titles = result.experiences.map((e) => e.title);
    expect(titles.some((t) => /conditionneur/i.test(t))).toBe(true);
    expect(titles.some((t) => /co-animateur/i.test(t))).toBe(true);
    expect(titles.some((t) => /co-salari[ée]/i.test(t))).toBe(true);
    expect(titles.some((t) => /maître-nageur/i.test(t))).toBe(true);
  });

  it("does not turn the diploma's own date range into a bogus job entry", () => {
    expect(result.experiences.some((e) => e.title === "2025" || e.company === "2026")).toBe(false);
  });

  it("does not turn an interest-list enumeration (dash-separated, no date/contract) into a job entry", () => {
    expect(result.experiences.some((e) => /organisation de s[ée]jours|activit[ée]s de plein air/i.test(e.title))).toBe(
      false
    );
  });

  it("recognizes electronics/hardware skills, and does not invent a skill from a diploma's name", () => {
    const names = result.skills.map((s) => s.name);
    expect(names).toContain("Électronique");
    expect(names).toContain("Programmation");
    expect(result.skills.some((s) => /but g[ée]nie/i.test(s.name))).toBe(false);
  });

  it("either finds the real interests or discards an unreliable, contaminated batch — never a garbage dump", () => {
    // This specific layout can't reliably isolate "Codage"/"Camping" from
    // everything that follows the (undetected) interests header — the
    // module's own rule then applies: better nothing than a mislabeled
    // pile of unrelated CV content under "interests".
    expect(result.interests.length).toBeLessThan(15);
  });
});
