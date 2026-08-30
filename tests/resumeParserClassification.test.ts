import { describe, it, expect } from "vitest";
import { parseResume } from "@/lib/resume/parseResume";

// Reproduces the exact misclassification reported by a real user: a BUT
// (Bachelor Universitaire de Technologie) degree, an intérim experience,
// electronics/hardware skills, and interests — with icon-prefixed section
// headers, which is how many real CV templates are formatted and is
// exactly what broke the old strict header regexes.
const TECHNICIAN_CV = `Jordan Martin
jordan.martin@email.com
06 12 34 56 78
69100 Villeurbanne
https://www.linkedin.com/in/jordan-martin-example

🎓 Formation
BUT GEII — 2022 — En cours
Baccalauréat général, mention bien — 2021

💼 Expériences professionnelles
Agent d'accueil / Conditionneur — Intérim
Juin 2026
Accueil des visiteurs, conditionnement de pièces électroniques, contrôle qualité.

🧠 Compétences
Électronique, Arduino, programmation, maintenance, conception électronique

🎯 Centres d'intérêt
Football, musculation, jeux vidéo
`;

describe("parseResume — real-world classification bug (icon-prefixed headers, BUT diploma)", () => {
  const result = parseResume(TECHNICIAN_CV);

  it("classifies the BUT degree as an education entry, not a skill or experience", () => {
    expect(result.educations.length).toBeGreaterThanOrEqual(1);
    const but = result.educations.find((e) => /but/i.test(e.degree ?? "") || /but/i.test(e.institution));
    expect(but).toBeTruthy();
    expect(but?.degree).toMatch(/but/i);
    // Must not have leaked into skills.
    expect(result.skills.some((s) => /but geii/i.test(s.name))).toBe(false);
  });

  it("recognizes the icon-prefixed 'Formation' header and captures both entries", () => {
    expect(result.educations.length).toBeGreaterThanOrEqual(2);
    expect(result.educations.some((e) => /bac/i.test(e.degree ?? ""))).toBe(true);
  });

  it("classifies the intérim role as an experience, not a formation", () => {
    expect(result.experiences.length).toBeGreaterThanOrEqual(1);
    const exp = result.experiences[0];
    expect(exp.title).toMatch(/accueil|conditionneur/i);
    expect(result.educations.some((e) => /accueil|conditionneur/i.test(e.institution))).toBe(false);
  });

  it("recognizes electronics/hardware skills that were missing from the dictionary", () => {
    const names = result.skills.map((s) => s.name);
    expect(names).toContain("Électronique");
    expect(names).toContain("Arduino");
  });

  it("separates interests from skills and experiences", () => {
    expect(result.interests).toContain("Football");
    expect(result.interests).toContain("musculation");
    expect(result.skills.some((s) => /football|musculation/i.test(s.name))).toBe(false);
  });

  it("extracts the LinkedIn link", () => {
    expect(result.links.some((l) => l.label === "LinkedIn")).toBe(true);
  });

  it("never invents data absent from the text", () => {
    expect(result.certifications).toEqual([]);
  });
});
