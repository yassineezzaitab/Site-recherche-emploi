import type { JobSourceAdapter } from "./types";
import { buildDemoJobs } from "./demoData";

export const demoSource: JobSourceAdapter = {
  key: "demo",
  name: "Offres de démonstration",
  kind: "DEMO",
  isConfigured() {
    return true;
  },
  async fetchJobs() {
    return buildDemoJobs();
  },
};
