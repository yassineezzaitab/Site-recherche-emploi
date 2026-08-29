const CONTRACT_LABELS: Record<string, string> = {
  CDI: "CDI",
  CDD: "CDD",
  STAGE: "Stage",
  ALTERNANCE: "Alternance",
  INTERIM: "Intérim",
  MISSION: "Mission",
  FREELANCE: "Freelance",
  SAISONNIER: "Saisonnier",
};

export function contractLabel(code: string): string {
  return CONTRACT_LABELS[code] ?? code;
}

const EXPERIENCE_LABELS: Record<string, string> = {
  STUDENT: "Étudiant",
  ENTRY: "Sans expérience",
  JUNIOR: "Junior",
  INTERMEDIATE: "Intermédiaire",
  SENIOR: "Confirmé / Senior",
  ANY: "Tous niveaux",
};

export function experienceLabel(code: string): string {
  return EXPERIENCE_LABELS[code] ?? code;
}

const REMOTE_LABELS: Record<string, string> = {
  ONSITE_ONLY: "Sur site",
  HYBRID: "Télétravail hybride",
  REMOTE_ONLY: "100% télétravail",
  NO_PREFERENCE: "Indifférent",
};

export function remoteLabel(code: string): string {
  return REMOTE_LABELS[code] ?? code;
}

export function formatSalary(min: number | null, max: number | null, period: string | null): string | null {
  if (min == null && max == null) return null;
  const unit = period === "HOUR" ? "€/h" : period === "YEAR" ? "€/an" : "€/mois";
  if (min != null && max != null && min !== max) return `${min} – ${max} ${unit}`;
  const value = max ?? min;
  return `${value} ${unit}`;
}

export function formatFreshness(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Vérifiée à l'instant";
  if (minutes < 60) return `Vérifiée il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Vérifiée il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Vérifiée hier";
  if (days < 30) return `Vérifiée il y a ${days} j`;
  return `Vérifiée le ${d.toLocaleDateString("fr-FR")}`;
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

const DAY_LABELS: Record<string, string> = {
  MON: "Lundi", TUE: "Mardi", WED: "Mercredi", THU: "Jeudi", FRI: "Vendredi", SAT: "Samedi", SUN: "Dimanche",
};
export function dayLabel(code: string): string {
  return DAY_LABELS[code] ?? code;
}

const SLOT_LABELS: Record<string, string> = {
  MORNING: "Matin", AFTERNOON: "Après-midi", EVENING: "Soir", NIGHT: "Nuit", WEEKEND: "Week-end",
};
export function slotLabel(code: string): string {
  return SLOT_LABELS[code] ?? code;
}
