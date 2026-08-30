import type { JobSourceAdapter } from "./types";
import { demoSource } from "./demoSource";
import { franceTravailSource } from "./franceTravailSource";
import { adzunaSource } from "./adzunaSource";
import { remoteOkSource } from "./remoteOkSource";

/**
 * All known source adapters. Adding a real source later (a partner feed,
 * another job board...) means writing one file implementing
 * JobSourceAdapter and adding it here — nothing else in the ingestion
 * pipeline changes.
 */
export const ALL_SOURCES: JobSourceAdapter[] = [
  demoSource,
  franceTravailSource,
  adzunaSource,
  remoteOkSource,
];

export function getConfiguredSources(): JobSourceAdapter[] {
  const appMode = (process.env.APP_MODE || "demo").trim();
  if (appMode === "demo") return [demoSource];
  // Production mode: use every real source that has valid credentials,
  // and fall back to demo data if none are configured yet so the app
  // never shows an empty results page.
  const real = ALL_SOURCES.filter((s) => s.kind !== "DEMO" && s.isConfigured());
  return real.length > 0 ? real : [demoSource];
}
