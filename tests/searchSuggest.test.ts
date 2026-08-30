import { describe, it, expect } from "vitest";
import { suggestProfessions, suggestFormations, suggestSkills, suggestSectors } from "@/lib/search/suggest";

describe("suggestProfessions", () => {
  it('suggests cashier/reception roles for "HO"', () => {
    const labels = suggestProfessions("HO").map((s) => s.label);
    expect(labels.some((l) => /caisse/i.test(l))).toBe(true);
    expect(labels.some((l) => /accueil/i.test(l))).toBe(true);
  });

  it('suggests developer roles for "dév"', () => {
    const labels = suggestProfessions("dév").map((s) => s.label);
    expect(labels.some((l) => /développeur web/i.test(l))).toBe(true);
    expect(labels.some((l) => /frontend/i.test(l))).toBe(true);
    expect(labels.some((l) => /backend/i.test(l))).toBe(true);
  });

  it('is accent-insensitive: "dev" also matches "Développeur..."', () => {
    const labels = suggestProfessions("dev").map((s) => s.label);
    expect(labels.some((l) => /développeur/i.test(l))).toBe(true);
  });

  it('suggests marketing roles for "mark"', () => {
    const labels = suggestProfessions("mark").map((s) => s.label);
    expect(labels.some((l) => /marketing/i.test(l))).toBe(true);
    expect(labels.length).toBeGreaterThan(1);
  });

  it("returns each canonical profession at most once", () => {
    const results = suggestProfessions("assistant");
    const labels = results.map((r) => r.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("does not suggest anything for a query with no match", () => {
    expect(suggestProfessions("zzzxxqq")).toEqual([]);
  });

  it("returns nothing for a query shorter than 2 characters", () => {
    expect(suggestProfessions("h")).toEqual([]);
  });

  it('suggests sales roles for "vendeur" (profile "métiers recherchés" field)', () => {
    const labels = suggestProfessions("vendeur").map((s) => s.label);
    expect(labels.some((l) => /vendeur/i.test(l))).toBe(true);
  });
});

describe("suggestSkills", () => {
  it("reuses the CV-parsing skills dictionary and matches by prefix", () => {
    const labels = suggestSkills("exc").map((s) => s.label);
    expect(labels).toContain("Excel");
  });

  it("does not fabricate a skill absent from the dictionary", () => {
    expect(suggestSkills("zzznotaskill")).toEqual([]);
  });
});

describe("suggestSectors", () => {
  it("suggests a sector derived from the profession dictionary's categories", () => {
    const labels = suggestSectors("comm").map((s) => s.label);
    expect(labels).toContain("Commerce");
  });

  it("never returns duplicate sector labels", () => {
    const labels = suggestSectors("a").map((s) => s.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe("suggestFormations", () => {
  it('suggests engineering formations for "ingénieur"', () => {
    const labels = suggestFormations("ingénieur").map((s) => s.label);
    expect(labels.some((l) => /ingénieur/i.test(l))).toBe(true);
  });

  it('suggests BTS formations for "BTS"', () => {
    const results = suggestFormations("BTS");
    expect(results.length).toBeGreaterThan(1);
    expect(results.every((r) => r.label.startsWith("BTS"))).toBe(true);
  });

  it('suggests BUT formations for "BUT"', () => {
    const results = suggestFormations("BUT");
    expect(results.length).toBeGreaterThan(1);
    expect(results.every((r) => r.label.startsWith("BUT"))).toBe(true);
  });

  it("does not fabricate a formation absent from the dictionary", () => {
    expect(suggestFormations("doctorat en magie")).toEqual([]);
  });
});
