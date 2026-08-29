import { cosineSimilarity } from "./textSimilarity";
import { haversineKm } from "@/lib/geo/distance";
import type { DimensionScore, MatchJobInput, MatchProfileInput, MatchResult } from "./types";

/**
 * Deterministic, explainable matching engine.
 *
 * The overall score is a weighted sum of six independent dimensions, each
 * scored 0-100 on its own scale, then combined with fixed weights that sum
 * to 1. Every dimension is rule-based (no ML model, no external API call),
 * which keeps scoring reproducible, free to compute at scale, and — crucially
 * for user trust — fully explainable: every number on screen can be traced
 * back to one of the functions below.
 *
 * Weights were chosen to reflect the product requirement that *practical*
 * compatibility (hours, distance, contract type) must be able to override a
 * strong *skills* match — e.g. a student capped at 15h/week must never see
 * a full-time role outrank a genuinely compatible part-time one just
 * because its skills line up better (see scoreAvailability below).
 */
const WEIGHTS = {
  skills: 0.3,
  availability: 0.18,
  location: 0.18,
  contractType: 0.12,
  experienceLevel: 0.12,
  salary: 0.1,
} as const;

const EXPERIENCE_ORDER = ["STUDENT", "ENTRY", "JUNIOR", "INTERMEDIATE", "SENIOR"];

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

function scoreSkills(profile: MatchProfileInput, job: MatchJobInput): DimensionScore {
  const profileSkills = new Set(profile.skills.map((s) => s.toLowerCase()));
  const jobSkills = new Set(job.requiredSkills.map((s) => s.toLowerCase()));

  let jaccard = 0;
  const matched: string[] = [];
  const missing: string[] = [];
  if (jobSkills.size > 0) {
    for (const s of jobSkills) {
      if (profileSkills.has(s)) matched.push(s);
      else missing.push(s);
    }
    const union = new Set([...profileSkills, ...jobSkills]).size;
    jaccard = union === 0 ? 0 : matched.length / jobSkills.size;
  }

  const lexical = cosineSimilarity(
    profile.experienceText,
    `${job.title} ${job.description}`
  );

  const combined =
    jobSkills.size > 0 ? jaccard * 0.65 + lexical * 0.35 : lexical;

  const score = clamp(Math.round(combined * 100));

  let detail: string;
  if (jobSkills.size === 0) {
    detail = "L'offre ne liste pas de compétences précises ; score basé sur la similarité du texte.";
  } else if (matched.length === jobSkills.size) {
    detail = `Toutes les compétences demandées (${matched.length}) sont présentes dans votre profil.`;
  } else if (matched.length > 0) {
    detail = `${matched.length}/${jobSkills.size} compétences demandées présentes. Manquantes : ${missing.slice(0, 4).join(", ")}.`;
  } else {
    detail = "Aucune des compétences demandées n'a été trouvée dans votre profil.";
  }

  return { key: "skills", label: "Compétences", score, weight: WEIGHTS.skills, detail };
}

function scoreAvailability(profile: MatchProfileInput, job: MatchJobInput): DimensionScore {
  if (!job.hoursPerWeek) {
    return {
      key: "availability",
      label: "Volume horaire",
      score: 70,
      weight: WEIGHTS.availability,
      detail: "Le volume horaire n'est pas précisé dans l'offre.",
    };
  }
  if (!profile.hoursPerWeekMax) {
    return {
      key: "availability",
      label: "Volume horaire",
      score: 80,
      weight: WEIGHTS.availability,
      detail: "Vous n'avez pas indiqué de plafond d'heures par semaine.",
    };
  }

  const excess = job.hoursPerWeek - profile.hoursPerWeekMax;
  if (excess <= 0) {
    const shortfall = profile.hoursPerWeekMin
      ? Math.max(0, profile.hoursPerWeekMin - job.hoursPerWeek)
      : 0;
    const score = shortfall > 0 ? clamp(100 - shortfall * 6) : 100;
    return {
      key: "availability",
      label: "Volume horaire",
      score,
      weight: WEIGHTS.availability,
      detail:
        shortfall > 0
          ? `Le poste propose ${job.hoursPerWeek}h/semaine, un peu en dessous de votre minimum souhaité (${profile.hoursPerWeekMin}h).`
          : `Le volume horaire (${job.hoursPerWeek}h/semaine) correspond à votre disponibilité.`,
    };
  }

  const score = clamp(100 - excess * 8);
  return {
    key: "availability",
    label: "Volume horaire",
    score,
    weight: WEIGHTS.availability,
    detail: `Le poste demande ${job.hoursPerWeek}h/semaine, au-delà de votre maximum (${profile.hoursPerWeekMax}h).`,
  };
}

function scoreLocation(profile: MatchProfileInput, job: MatchJobInput): DimensionScore {
  const maxDistance = profile.maxDistanceKm ?? 25;

  if (profile.remotePreference === "REMOTE_ONLY" && job.remoteType === "ONSITE_ONLY") {
    return {
      key: "location",
      label: "Localisation",
      score: 10,
      weight: WEIGHTS.location,
      detail: "Vous recherchez uniquement du télétravail ; ce poste est en présentiel.",
    };
  }

  if (job.remoteType === "REMOTE_ONLY" && profile.remotePreference !== "ONSITE_ONLY") {
    return {
      key: "location",
      label: "Localisation",
      score: 100,
      weight: WEIGHTS.location,
      detail: "Poste 100% télétravail : la distance domicile-travail n'entre pas en compte.",
    };
  }

  if (
    profile.latitude == null ||
    profile.longitude == null ||
    job.latitude == null ||
    job.longitude == null
  ) {
    return {
      key: "location",
      label: "Localisation",
      score: 60,
      weight: WEIGHTS.location,
      detail: job.city
        ? `Localisation approximative (${job.city}) — distance exacte non calculable.`
        : "Localisation non précisée.",
    };
  }

  const distanceKm = haversineKm(profile.latitude, profile.longitude, job.latitude, job.longitude);
  const score =
    distanceKm <= maxDistance
      ? clamp(100 - (distanceKm / maxDistance) * 30)
      : clamp(70 - (distanceKm - maxDistance) * 4);

  const hybridBonus = job.remoteType === "HYBRID" ? 8 : 0;

  return {
    key: "location",
    label: "Localisation",
    score: clamp(score + hybridBonus),
    weight: WEIGHTS.location,
    detail: `${Math.round(distanceKm)} km de chez vous (rayon souhaité : ${maxDistance} km)${
      job.remoteType === "HYBRID" ? ", poste en télétravail hybride" : ""
    }.`,
  };
}

function scoreContractType(profile: MatchProfileInput, job: MatchJobInput): DimensionScore {
  if (profile.contractTypes.length === 0) {
    return {
      key: "contractType",
      label: "Type de contrat",
      score: 80,
      weight: WEIGHTS.contractType,
      detail: "Vous n'avez pas restreint les types de contrats recherchés.",
    };
  }
  const wanted = profile.contractTypes.includes(job.contractType);
  return {
    key: "contractType",
    label: "Type de contrat",
    score: wanted ? 100 : 25,
    weight: WEIGHTS.contractType,
    detail: wanted
      ? `Le contrat (${job.contractType}) correspond à vos préférences.`
      : `Vous recherchez plutôt : ${profile.contractTypes.join(", ")} (offre en ${job.contractType}).`,
  };
}

function scoreExperienceLevel(profile: MatchProfileInput, job: MatchJobInput): DimensionScore {
  if (job.experienceLevel === "ANY" || profile.experienceLevel === "ANY") {
    return {
      key: "experienceLevel",
      label: "Niveau d'expérience",
      score: 90,
      weight: WEIGHTS.experienceLevel,
      detail: "Le niveau d'expérience requis est flexible.",
    };
  }
  const jobIdx = EXPERIENCE_ORDER.indexOf(job.experienceLevel);
  const profileIdx = EXPERIENCE_ORDER.indexOf(profile.experienceLevel);
  const diff = jobIdx - profileIdx;

  const score = diff <= 0 ? 100 : clamp(100 - diff * 35);
  return {
    key: "experienceLevel",
    label: "Niveau d'expérience",
    score,
    weight: WEIGHTS.experienceLevel,
    detail:
      diff <= 0
        ? "Votre niveau d'expérience correspond ou dépasse ce qui est demandé."
        : `L'offre demande un niveau supérieur au vôtre (${job.experienceLevel.toLowerCase()} vs votre profil ${profile.experienceLevel.toLowerCase()}).`,
  };
}

function normalizeMonthlySalary(job: MatchJobInput): number | null {
  const amount = job.salaryMax ?? job.salaryMin;
  if (amount == null) return null;
  switch (job.salaryPeriod) {
    case "HOUR":
      return Math.round(amount * 151.67);
    case "YEAR":
      return Math.round(amount / 12);
    case "MONTH":
    default:
      return amount;
  }
}

function scoreSalary(profile: MatchProfileInput, job: MatchJobInput): DimensionScore {
  if (!profile.minSalaryMonthly) {
    return {
      key: "salary",
      label: "Rémunération",
      score: 75,
      weight: WEIGHTS.salary,
      detail: "Vous n'avez pas indiqué de salaire minimum souhaité.",
    };
  }
  const normalized = normalizeMonthlySalary(job);
  if (normalized == null) {
    return {
      key: "salary",
      label: "Rémunération",
      score: 55,
      weight: WEIGHTS.salary,
      detail: "La rémunération n'est pas précisée dans l'offre.",
    };
  }
  if (normalized >= profile.minSalaryMonthly) {
    return {
      key: "salary",
      label: "Rémunération",
      score: 100,
      weight: WEIGHTS.salary,
      detail: `La rémunération proposée (~${normalized} €/mois) atteint votre minimum (${profile.minSalaryMonthly} €).`,
    };
  }
  const ratio = normalized / profile.minSalaryMonthly;
  return {
    key: "salary",
    label: "Rémunération",
    score: clamp(ratio * 90),
    weight: WEIGHTS.salary,
    detail: `La rémunération proposée (~${normalized} €/mois) est en dessous de votre minimum (${profile.minSalaryMonthly} €).`,
  };
}

export function computeMatch(profile: MatchProfileInput, job: MatchJobInput): MatchResult {
  const dimensions = [
    scoreSkills(profile, job),
    scoreAvailability(profile, job),
    scoreLocation(profile, job),
    scoreContractType(profile, job),
    scoreExperienceLevel(profile, job),
    scoreSalary(profile, job),
  ];

  const score = clamp(
    Math.round(dimensions.reduce((sum, d) => sum + d.score * d.weight, 0))
  );

  const strengths = dimensions
    .filter((d) => d.score >= 75)
    .sort((a, b) => b.score - a.score)
    .map((d) => `${d.label} : ${d.detail}`);

  const weaknesses = dimensions
    .filter((d) => d.score < 50)
    .sort((a, b) => a.score - b.score)
    .map((d) => `${d.label} : ${d.detail}`);

  const advice = buildAdvice(dimensions, profile);

  return { score, dimensions, strengths, weaknesses, advice };
}

function buildAdvice(dimensions: DimensionScore[], profile: MatchProfileInput): string[] {
  const advice: string[] = [];
  const byKey = Object.fromEntries(dimensions.map((d) => [d.key, d]));

  const weakestDim = [...dimensions].sort((a, b) => a.score - b.score)[0];
  if (weakestDim && weakestDim.score < 60) {
    switch (weakestDim.key) {
      case "skills":
        advice.push(
          "Mettez en avant vos expériences et compétences les plus proches de celles demandées dans votre lettre de motivation."
        );
        break;
      case "availability":
        advice.push(
          "Si le volume horaire ne correspond pas exactement, précisez dans votre message votre disponibilité réelle : l'employeur ajuste parfois le planning."
        );
        break;
      case "location":
        advice.push(
          "Vérifiez les temps de trajet en transports en commun avant de postuler, ou demandez si le télétravail partiel est envisageable."
        );
        break;
      case "salary":
        advice.push(
          "La rémunération semble en dessous de votre attente : elle peut parfois être négociée à l'entretien, surtout si votre profil est solide."
        );
        break;
      case "experienceLevel":
        advice.push(
          "Le niveau demandé est supérieur au vôtre : mettez en avant votre capacité d'apprentissage rapide et vos projets personnels pertinents."
        );
        break;
      case "contractType":
        advice.push(
          "Le type de contrat ne correspond pas à ce que vous recherchez en priorité — vérifiez si une évolution de contrat est possible."
        );
        break;
    }
  }

  const skillsDim = byKey["skills"];
  if (skillsDim && skillsDim.score >= 75) {
    advice.push(
      "Vos compétences correspondent bien : citez des exemples concrets de résultats obtenus pour vous démarquer."
    );
  }

  if (profile.yearsOfExperience === 0) {
    advice.push(
      "Vous débutez : insistez sur votre motivation, vos projets personnels/académiques et votre disponibilité immédiate."
    );
  }

  return advice.slice(0, 3);
}
