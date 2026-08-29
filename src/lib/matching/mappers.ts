import type { Job, Profile, Experience, ProfileSkill, Skill } from "@prisma/client";
import type { MatchJobInput, MatchProfileInput } from "./types";

type ProfileWithRelations = Profile & {
  skills: (ProfileSkill & { skill: Skill })[];
  experiences: Experience[];
};

export function toMatchProfileInput(profile: ProfileWithRelations): MatchProfileInput {
  const now = new Date();
  const yearsOfExperience = profile.experiences.reduce((sum, exp) => {
    const start = exp.startDate ? new Date(exp.startDate) : null;
    if (!start) return sum;
    const end = exp.isCurrent || !exp.endDate ? now : new Date(exp.endDate);
    const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return sum + Math.max(0, years);
  }, 0);

  const experienceText = [
    profile.headline ?? "",
    profile.summary ?? "",
    ...profile.experiences.map((e) => `${e.title} ${e.company} ${e.description ?? ""}`),
    ...profile.skills.map((s) => s.skill.name),
  ].join(" ");

  return {
    skills: profile.skills.map((s) => s.skill.name),
    desiredTitles: profile.desiredTitles,
    sectors: profile.sectors,
    contractTypes: profile.contractTypes,
    minSalaryMonthly: profile.minSalaryMonthly,
    maxDistanceKm: profile.maxDistanceKm,
    remotePreference: profile.remotePreference,
    experienceLevel: profile.experienceLevel,
    availableDays: profile.availableDays,
    hoursPerWeekMin: profile.hoursPerWeekMin,
    hoursPerWeekMax: profile.hoursPerWeekMax,
    latitude: profile.latitude,
    longitude: profile.longitude,
    yearsOfExperience: Math.round(yearsOfExperience),
    experienceText,
  };
}

export function toMatchJobInput(job: Job): MatchJobInput {
  return {
    title: job.title,
    description: job.description,
    requiredSkills: job.requiredSkills,
    contractType: job.contractType,
    experienceLevel: job.experienceLevel,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryPeriod: job.salaryPeriod,
    hoursPerWeek: job.hoursPerWeek,
    remoteType: job.remoteType,
    latitude: job.latitude,
    longitude: job.longitude,
    city: job.city,
  };
}
