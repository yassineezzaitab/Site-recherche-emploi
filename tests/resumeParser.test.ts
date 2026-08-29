import { describe, it, expect } from "vitest";
import { parseResume } from "@/lib/resume/parseResume";

const SAMPLE_CV = `Camille Durand
camille.durand@email.com
06 12 34 56 78
75011 Paris

Profil
Étudiante en école d'ingénieur, à la recherche d'un job étudiant.

Expérience professionnelle
Vendeuse - Boutique Mode Plus
Juin 2023 - Septembre 2023
Accueil client, tenue de caisse, mise en rayon.

Serveuse - Café du Coin
Janvier 2022 - Mai 2022
Service en salle, prise de commandes, relation client.

Formation
Master Informatique - École Centrale
Septembre 2023 - Présent

Bac Général, mention bien - Lycée Victor Hugo
Septembre 2019 - Juillet 2021

Compétences
Excel, Word, JavaScript, Python, travail d'équipe, autonomie

Langues
Français natif
Anglais courant
Espagnol notions

Certifications
TOEIC 900 - ETS Global
`;

describe("parseResume", () => {
  const result = parseResume(SAMPLE_CV);

  it("extracts contact info", () => {
    expect(result.email).toBe("camille.durand@email.com");
    expect(result.phone).toContain("06");
    expect(result.fullName).toBe("Camille Durand");
    expect(result.city).toBe("Paris");
  });

  it("extracts skills present in the text only", () => {
    const names = result.skills.map((s) => s.name);
    expect(names).toContain("Excel");
    expect(names).toContain("JavaScript");
    expect(names).toContain("Python");
    expect(names).toContain("Travail d'équipe");
    // Should not hallucinate skills that are not in the text
    expect(names).not.toContain("Docker");
  });

  it("extracts experiences with company/title/dates", () => {
    expect(result.experiences.length).toBeGreaterThanOrEqual(2);
    const vendeuse = result.experiences.find((e) => /vendeuse/i.test(e.title));
    expect(vendeuse).toBeTruthy();
    expect(vendeuse?.company).toMatch(/boutique/i);
    expect(vendeuse?.startDate).toBe("2023-06-01");
  });

  it("extracts education entries", () => {
    expect(result.educations.length).toBeGreaterThanOrEqual(2);
    const master = result.educations.find((e) => /master/i.test(e.degree ?? ""));
    expect(master).toBeTruthy();
  });

  it("extracts languages with levels", () => {
    const fr = result.languages.find((l) => l.name === "Français");
    const en = result.languages.find((l) => l.name === "Anglais");
    expect(fr?.level).toBe("Natif / bilingue");
    expect(en?.level).toMatch(/Courant/);
  });

  it("extracts certifications", () => {
    expect(result.certifications.length).toBeGreaterThanOrEqual(1);
    expect(result.certifications[0].name).toMatch(/TOEIC/);
  });

  it("never invents data for an empty resume", () => {
    const empty = parseResume("");
    expect(empty.experiences).toEqual([]);
    expect(empty.educations).toEqual([]);
    expect(empty.skills).toEqual([]);
    expect(empty.warnings.length).toBeGreaterThan(0);
  });
});
