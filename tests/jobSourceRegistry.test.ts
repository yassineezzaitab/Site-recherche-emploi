import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getConfiguredSources } from "@/lib/jobs/sources/registry";

// Regression test for a real production bug: getConfiguredSources() used to
// default APP_MODE to "demo" whenever the env var was unset, which meant a
// deployment that never explicitly set APP_MODE served 100% fictional job
// listings to real users forever — even though RemoteOK (a real, free
// source) needs zero configuration and should "just work" the moment the
// app isn't explicitly in demo mode.

const ENV_KEYS = [
  "APP_MODE",
  "FRANCE_TRAVAIL_CLIENT_ID",
  "FRANCE_TRAVAIL_CLIENT_SECRET",
  "ADZUNA_APP_ID",
  "ADZUNA_APP_KEY",
] as const;

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("getConfiguredSources", () => {
  it("never falls back to demo when APP_MODE is simply unset (the real-world bug)", () => {
    // No APP_MODE, no credentials at all — this is exactly the state of a
    // freshly deployed app whose operator forgot to set APP_MODE.
    const sources = getConfiguredSources();
    expect(sources.some((s) => s.kind === "DEMO")).toBe(false);
    // RemoteOK requires no credentials, so it must be present.
    expect(sources.some((s) => s.key === "remoteok")).toBe(true);
  });

  it("uses demo data only when APP_MODE is explicitly 'demo'", () => {
    process.env.APP_MODE = "demo";
    const sources = getConfiguredSources();
    expect(sources).toHaveLength(1);
    expect(sources[0].kind).toBe("DEMO");
  });

  it("includes France Travail once its credentials are set, alongside RemoteOK", () => {
    process.env.FRANCE_TRAVAIL_CLIENT_ID = "id";
    process.env.FRANCE_TRAVAIL_CLIENT_SECRET = "secret";
    const sources = getConfiguredSources();
    expect(sources.some((s) => s.key === "france_travail")).toBe(true);
    expect(sources.some((s) => s.key === "remoteok")).toBe(true);
    expect(sources.some((s) => s.kind === "DEMO")).toBe(false);
  });

  it("excludes Adzuna when only one of its two required credentials is set", () => {
    process.env.ADZUNA_APP_ID = "id-only";
    const sources = getConfiguredSources();
    expect(sources.some((s) => s.key === "adzuna")).toBe(false);
  });
});
