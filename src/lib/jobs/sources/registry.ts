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
  // IMPORTANT: unlike most env flags here, this one must NOT default to
  // "demo" when unset — an operator forgetting to set APP_MODE on a real
  // deployment must never silently serve fictional listings to real users.
  // Demo mode is opt-in only, via an explicit APP_MODE=demo (local dev).
  const appMode = (process.env.APP_MODE || "").trim().toLowerCase();
  if (appMode === "demo") return [demoSource];

  // Any real, usable source — RemoteOK needs zero configuration, so this
  // is non-empty the moment APP_MODE isn't explicitly "demo".
  const real = ALL_SOURCES.filter((s) => s.kind !== "DEMO" && s.isConfigured());
  if (real.length > 0) return real;

  // Unreachable once deployed (RemoteOK alone guarantees the branch above),
  // but keeps local dev usable with no configuration and no network access.
  return [demoSource];
}
