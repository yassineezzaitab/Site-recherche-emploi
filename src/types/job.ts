export interface JobListItem {
  id: string;
  title: string;
  companyNameRaw: string;
  city: string | null;
  region: string | null;
  contractType: string;
  experienceLevel: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryPeriod: string | null;
  hoursPerWeek: number | null;
  remoteType: string;
  publishedAt: string;
  lastVerifiedAt: string;
  requiredSkills: string[];
  distanceKm: number | null;
  commuteMinutes: number | null;
  match: { score: number; dimensions: DimensionScore[] } | null;
}

export interface DimensionScore {
  key: string;
  label: string;
  score: number;
  weight: number;
  detail: string;
}

export interface MatchResult {
  score: number;
  dimensions: DimensionScore[];
  strengths: string[];
  weaknesses: string[];
  advice: string[];
}
