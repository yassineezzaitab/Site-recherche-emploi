import { describe, it, expect } from "vitest";
import { computeMatch } from "@/lib/matching/engine";
import type { MatchJobInput, MatchProfileInput } from "@/lib/matching/types";

const baseProfile: MatchProfileInput = {
  skills: ["JavaScript", "React", "Excel"],
  desiredTitles: ["Développeur"],
  sectors: ["Tech"],
  contractTypes: ["STAGE", "ALTERNANCE"],
  minSalaryMonthly: 800,
  maxDistanceKm: 20,
  remotePreference: "NO_PREFERENCE",
  experienceLevel: "STUDENT",
  availableDays: ["MON", "TUE", "WED"],
  hoursPerWeekMin: 10,
  hoursPerWeekMax: 15,
  latitude: 48.8566,
  longitude: 2.3522, // Paris
  yearsOfExperience: 0,
  experienceText: "Stage développeur web React JavaScript vente conseil client",
};

const partTimeJob: MatchJobInput = {
  title: "Développeur web junior",
  description: "Mission de développement React et JavaScript pour une startup.",
  requiredSkills: ["JavaScript", "React"],
  contractType: "STAGE",
  experienceLevel: "STUDENT",
  salaryMin: 900,
  salaryMax: 900,
  salaryPeriod: "MONTH",
  hoursPerWeek: 15,
  remoteType: "HYBRID",
  latitude: 48.86,
  longitude: 2.35,
  city: "Paris",
};

const fullTimeJob: MatchJobInput = {
  ...partTimeJob,
  title: "Développeur web confirmé",
  contractType: "CDI",
  experienceLevel: "JUNIOR",
  hoursPerWeek: 35,
};

describe("computeMatch", () => {
  it("scores a well-aligned part-time job highly", () => {
    const result = computeMatch(baseProfile, partTimeJob);
    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.dimensions.find((d) => d.key === "skills")!.score).toBeGreaterThan(70);
  });

  it("penalizes a full-time job for a student capped at 15h/week even with strong skill match", () => {
    const partTimeResult = computeMatch(baseProfile, partTimeJob);
    const fullTimeResult = computeMatch(baseProfile, fullTimeJob);

    // Practical constraints must be able to override a good skills match.
    expect(fullTimeResult.score).toBeLessThan(partTimeResult.score);
    const availDim = fullTimeResult.dimensions.find((d) => d.key === "availability")!;
    expect(availDim.score).toBeLessThan(20);
  });

  it("never invents strengths for dimensions it scored low", () => {
    const result = computeMatch(baseProfile, fullTimeJob);
    const weakLabels = result.dimensions.filter((d) => d.score < 50).map((d) => d.label);
    for (const w of weakLabels) {
      expect(result.strengths.some((s) => s.startsWith(w))).toBe(false);
    }
  });

  it("gives full remote jobs a neutral-to-positive location score regardless of distance", () => {
    const remoteJob: MatchJobInput = {
      ...partTimeJob,
      remoteType: "REMOTE_ONLY",
      latitude: 43.6, // Marseille — far from the profile's Paris location
      longitude: 5.4,
    };
    const result = computeMatch(baseProfile, remoteJob);
    expect(result.dimensions.find((d) => d.key === "location")!.score).toBe(100);
  });

  it("produces a score between 0 and 100 and provides advice", () => {
    const result = computeMatch(baseProfile, fullTimeJob);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.advice.length).toBeGreaterThan(0);
  });
});
