import { describe, it, expect } from "vitest";
import { parseNaturalLanguageQuery } from "@/lib/nlp/parseQuery";

describe("parseNaturalLanguageQuery", () => {
  it("parses the student availability example from the spec", () => {
    const q = parseNaturalLanguageQuery(
      "Je suis étudiant en école d'ingénieur. Je peux travailler 10 à 15 heures par semaine, principalement le soir et le samedi. Je cherche quelque chose à moins de 30 minutes de chez moi."
    );
    expect(q.experienceLevel).toBe("STUDENT");
    expect(q.hoursPerWeekMin).toBe(10);
    expect(q.hoursPerWeekMax).toBe(15);
    expect(q.slots).toContain("EVENING");
    expect(q.days).toContain("SAT");
    expect(q.maxCommuteMinutes).toBe(30);
  });

  it('parses "Trouve-moi un job étudiant à moins de 20 minutes."', () => {
    const q = parseNaturalLanguageQuery("Trouve-moi un job étudiant à moins de 20 minutes.");
    expect(q.experienceLevel).toBe("STUDENT");
    expect(q.maxCommuteMinutes).toBe(20);
  });

  it('parses "Je veux travailler uniquement le week-end."', () => {
    const q = parseNaturalLanguageQuery("Je veux travailler uniquement le week-end.");
    expect(q.days).toEqual(expect.arrayContaining(["SAT", "SUN"]));
    expect(q.slots).toContain("WEEKEND");
  });

  it('parses "Trouve-moi des missions de marketing."', () => {
    const q = parseNaturalLanguageQuery("Trouve-moi des missions de marketing.");
    expect(q.contractTypes).toContain("MISSION");
    expect(q.sectors).toContain("Marketing");
  });

  it('parses "Je veux quelque chose sans expérience."', () => {
    const q = parseNaturalLanguageQuery("Je veux quelque chose sans expérience.");
    expect(q.experienceLevel).toBe("ENTRY");
  });

  it('parses "Je peux travailler mardi et jeudi soir."', () => {
    const q = parseNaturalLanguageQuery("Je peux travailler mardi et jeudi soir.");
    expect(q.days).toEqual(expect.arrayContaining(["TUE", "THU"]));
    expect(q.slots).toContain("EVENING");
  });

  it('parses "Je veux au moins 800 € par mois."', () => {
    const q = parseNaturalLanguageQuery("Je veux au moins 800 € par mois.");
    expect(q.minSalaryMonthly).toBe(800);
  });

  it("does not fabricate criteria absent from the text", () => {
    const q = parseNaturalLanguageQuery("Je cherche un poste de développeur.");
    expect(q.hoursPerWeekMax).toBeNull();
    expect(q.minSalaryMonthly).toBeNull();
    expect(q.maxDistanceKm).toBeNull();
    expect(q.days).toEqual([]);
  });
});
