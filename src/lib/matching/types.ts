export interface MatchProfileInput {
  skills: string[]; // canonical skill names
  desiredTitles: string[];
  sectors: string[];
  contractTypes: string[]; // e.g. ["CDI", "STAGE"]
  minSalaryMonthly: number | null;
  maxDistanceKm: number | null;
  remotePreference: "ONSITE_ONLY" | "HYBRID" | "REMOTE_ONLY" | "NO_PREFERENCE";
  experienceLevel: "STUDENT" | "ENTRY" | "JUNIOR" | "INTERMEDIATE" | "SENIOR" | "ANY";
  availableDays: string[];
  hoursPerWeekMin: number | null;
  hoursPerWeekMax: number | null;
  latitude: number | null;
  longitude: number | null;
  yearsOfExperience: number; // derived from Experience rows
  experienceText: string; // concatenated titles + descriptions, for lexical similarity
}

export interface MatchJobInput {
  title: string;
  description: string;
  requiredSkills: string[];
  contractType: string;
  experienceLevel: "STUDENT" | "ENTRY" | "JUNIOR" | "INTERMEDIATE" | "SENIOR" | "ANY";
  salaryMin: number | null;
  salaryMax: number | null;
  salaryPeriod: "HOUR" | "MONTH" | "YEAR" | null;
  hoursPerWeek: number | null;
  remoteType: "ONSITE_ONLY" | "HYBRID" | "REMOTE_ONLY" | "NO_PREFERENCE";
  latitude: number | null;
  longitude: number | null;
  city: string | null;
}

export interface DimensionScore {
  key: string;
  label: string;
  score: number; // 0-100 within the dimension
  weight: number; // fraction of total (sums to 1 across all dimensions)
  detail: string;
}

export interface MatchResult {
  score: number; // 0-100 overall
  dimensions: DimensionScore[];
  strengths: string[];
  weaknesses: string[];
  advice: string[];
}
