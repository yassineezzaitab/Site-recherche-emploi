import { describe, it, expect } from "vitest";
import { haversineKm, estimateCommuteMinutes } from "@/lib/geo/distance";

describe("haversineKm", () => {
  it("returns ~0 for the same point", () => {
    expect(haversineKm(48.8566, 2.3522, 48.8566, 2.3522)).toBeCloseTo(0, 3);
  });

  it("computes a realistic distance between Paris and Lyon", () => {
    const km = haversineKm(48.8566, 2.3522, 45.764, 4.8357);
    expect(km).toBeGreaterThan(380);
    expect(km).toBeLessThan(400);
  });
});

describe("estimateCommuteMinutes", () => {
  it("is monotonic increasing with distance", () => {
    const a = estimateCommuteMinutes(3);
    const b = estimateCommuteMinutes(10);
    const c = estimateCommuteMinutes(50);
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
  });
});
