import type { Job, Profile, Experience, Education, ProfileSkill, Skill } from "@prisma/client";
import type { MatchResult } from "@/lib/matching/types";

type ProfileWithRelations = Profile & {
  experiences: Experience[];
  educations: Education[];
  skills: (ProfileSkill & { skill: Skill })[];
};

/**
 * Deterministic, template-based cover letter generator (§16).
 *
 * This is explicitly NOT a call to a generative language model: every
 * sentence is built from a fixed template filled in with values that exist
 * verbatim in the user's profile/CV or the job listing. This guarantees
 * the "never invent an experience or skill" requirement by construction —
 * there's no generation step that could hallucinate, because there's no
 * free-form generation at all. The user can freely edit the result
 * afterwards (the API returns plain editable text).
 */
export function generateCoverLetter(
  profile: ProfileWithRelations,
  job: Job,
  match: MatchResult | null
): string {
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Candidat";
  const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const mostRecentExperience = [...profile.experiences].sort((a, b) => {
    const da = a.startDate ? new Date(a.startDate).getTime() : 0;
    const db = b.startDate ? new Date(b.startDate).getTime() : 0;
    return db - da;
  })[0];

  const matchedSkillNames = match
    ? profile.skills
        .map((s) => s.skill.name)
        .filter((name) => job.requiredSkills.some((rs) => rs.toLowerCase() === name.toLowerCase()))
    : [];

  const topEducation = [...profile.educations].sort((a, b) => {
    const da = a.endDate ? new Date(a.endDate).getTime() : a.isCurrent ? Infinity : 0;
    const db = b.endDate ? new Date(b.endDate).getTime() : b.isCurrent ? Infinity : 0;
    return db - da;
  })[0];

  const paragraphs: string[] = [];

  paragraphs.push(
    `${fullName}${profile.city ? `\n${profile.city}` : ""}${profile.phone ? `\n${profile.phone}` : ""}\n\n${today}`
  );

  paragraphs.push(`Objet : Candidature au poste de ${job.title} — ${job.companyNameRaw}`);

  const openingExperienceClause = mostRecentExperience
    ? ` Mon expérience de ${mostRecentExperience.title}${mostRecentExperience.company ? ` chez ${mostRecentExperience.company}` : ""} m'a permis de développer des compétences directement utiles pour ce poste.`
    : "";
  paragraphs.push(
    `Madame, Monsieur,\n\nVotre offre de ${job.title} chez ${job.companyNameRaw} a retenu toute mon attention et je vous propose ma candidature.${openingExperienceClause}`
  );

  if (matchedSkillNames.length > 0) {
    paragraphs.push(
      `Je maîtrise notamment ${formatList(matchedSkillNames)}, des compétences qui correspondent directement aux besoins exprimés dans votre annonce.`
    );
  }

  if (topEducation) {
    const degreeText = topEducation.degree ? `${topEducation.degree} — ` : "";
    paragraphs.push(
      `Ma formation (${degreeText}${topEducation.institution}) complète cette expérience et m'a apporté les bases nécessaires pour être rapidement opérationnel(le).`
    );
  }

  if (profile.availableDays.length > 0 || profile.hoursPerWeekMax) {
    const hoursText = profile.hoursPerWeekMax
      ? `jusqu'à ${profile.hoursPerWeekMax} heures par semaine`
      : "selon les disponibilités indiquées dans mon profil";
    paragraphs.push(`Je suis disponible ${hoursText} et prêt(e) à débuter rapidement.`);
  }

  paragraphs.push(
    `Je me tiens à votre disposition pour un entretien afin de vous exposer plus en détail ma motivation et d'échanger sur les modalités du poste.\n\nCordialement,\n${fullName}`
  );

  return paragraphs.join("\n\n");
}

function formatList(items: string[]): string {
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
}
