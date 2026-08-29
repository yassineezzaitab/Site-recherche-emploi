import { describe, it, expect } from "vitest";
import { mapOffer as mapFranceTravailOffer } from "@/lib/jobs/sources/franceTravailSource";
import { mapOffer as mapAdzunaOffer, type AdzunaResult } from "@/lib/jobs/sources/adzunaSource";
import { mapOffer as mapRemoteOkOffer, type RemoteOkResult } from "@/lib/jobs/sources/remoteOkSource";

// These fixtures mirror the documented response shapes for each API
// (see the HONESTY NOTE comments in each adapter file for provenance —
// gathered via web search since this environment has no live network
// access to verify against the real APIs). They exist to catch mapping
// regressions and crashes, not to prove the live APIs behave identically.

describe("franceTravailSource.mapOffer", () => {
  it("maps a well-formed offer", () => {
    const offer = {
      id: "123ABC",
      intitule: "Développeur web",
      description: "Mission de développement.",
      typeContrat: "CDI",
      experienceExige: "D",
      dateCreation: "2026-01-15T10:00:00.000Z",
      dureeTravailLibelleConverti: "Temps plein",
      lieuTravail: { libelle: "75 - Paris", codePostal: "75011", latitude: 48.86, longitude: 2.35 },
      entreprise: { nom: "Acme SAS" },
      origineOffre: { urlOrigine: "https://example.org/offre/123" },
      competences: [{ libelle: "JavaScript" }, { libelle: "React" }],
    };
    const job = mapFranceTravailOffer(offer);
    expect(job).not.toBeNull();
    expect(job?.title).toBe("Développeur web");
    expect(job?.companyName).toBe("Acme SAS");
    expect(job?.contractType).toBe("CDI");
    expect(job?.experienceLevel).toBe("ENTRY");
    expect(job?.latitude).toBe(48.86);
    expect(job?.requiredSkills).toEqual(["JavaScript", "React"]);
    expect(job?.hoursPerWeek).toBe(35);
  });

  it("returns null for an offer missing required fields", () => {
    expect(mapFranceTravailOffer({ id: "x" })).toBeNull();
    expect(mapFranceTravailOffer({ intitule: "Titre" })).toBeNull();
  });

  it("never throws on malformed nested data", () => {
    expect(() =>
      mapFranceTravailOffer({ id: "1", intitule: "T", lieuTravail: "not-an-object" })
    ).not.toThrow();
  });
});

describe("adzunaSource.mapOffer", () => {
  it("maps a well-formed result and converts annual salary to monthly", () => {
    const result: AdzunaResult = {
      id: "999",
      title: "Consultant marketing",
      description: "Poste de consultant.",
      company: { display_name: "Bloomly" },
      location: { display_name: "Paris, Île-de-France", area: ["France", "Île-de-France", "Paris"] },
      salary_min: 30000,
      salary_max: 36000,
      contract_type: "permanent",
      contract_time: "full_time",
      created: "2026-02-01T00:00:00Z",
      redirect_url: "https://adzuna.fr/land/ad/999",
      latitude: 48.85,
      longitude: 2.35,
    };
    const job = mapAdzunaOffer(result);
    expect(job).not.toBeNull();
    expect(job?.companyName).toBe("Bloomly");
    expect(job?.contractType).toBe("CDI");
    expect(job?.salaryMin).toBe(2500); // 30000 / 12
    expect(job?.salaryMax).toBe(3000); // 36000 / 12
    expect(job?.salaryPeriod).toBe("MONTH");
    expect(job?.city).toBe("Paris");
  });

  it("returns null when id or title is missing", () => {
    expect(mapAdzunaOffer({ title: "x" })).toBeNull();
    expect(mapAdzunaOffer({ id: "1" })).toBeNull();
  });
});

describe("remoteOkSource.mapOffer", () => {
  it("maps a well-formed result as a remote job", () => {
    const result: RemoteOkResult = {
      id: 42,
      position: "Frontend Engineer",
      company: "Nova Digital",
      description: "Remote React role.",
      location: "Worldwide",
      tags: ["react", "typescript"],
      salary_min: 60000,
      salary_max: 80000,
      date: "2026-03-01T00:00:00Z",
      url: "https://remoteok.com/remote-jobs/42",
    };
    const job = mapRemoteOkOffer(result);
    expect(job).not.toBeNull();
    expect(job?.remoteType).toBe("REMOTE_ONLY");
    expect(job?.city).toBeUndefined(); // "Worldwide" is not a real city
    expect(job?.requiredSkills).toEqual(["react", "typescript"]);
  });

  it("returns null when position or company is missing", () => {
    expect(mapRemoteOkOffer({ id: 1, company: "Acme" })).toBeNull();
    expect(mapRemoteOkOffer({ id: 1, position: "Dev" })).toBeNull();
  });
});
