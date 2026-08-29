import type { Job, Profile, Experience, Education, ProfileSkill, Skill } from "@prisma/client";

type ProfileWithRelations = Profile & {
  experiences: Experience[];
  educations: Education[];
  skills: (ProfileSkill & { skill: Skill })[];
};

export interface AdaptedCv {
  headline: string;
  highlightedSkills: string[]; // skills present in both profile and job, shown first
  otherSkills: string[];
  reorderedExperiences: { experience: Experience; relevant: boolean; reason: string | null }[];
  educations: Education[];
  suggestions: string[];
}

/**
 * "Adapter mon CV à cette offre" (§15): reorders and highlights information
 * that already exists in the user's profile — it never invents an
 * experience, skill, or qualification that isn't there. The only generated
 * text is the reordering rationale and the suggested headline, both built
 * from literal data (skill names, job title) rather than freely generated.
 */
export function adaptCvToJob(profile: ProfileWithRelations, job: Job): AdaptedCv {
  const jobSkillsLower = new Set(job.requiredSkills.map((s) => s.toLowerCase()));
  const profileSkillNames = profile.skills.map((s) => s.skill.name);

  const highlightedSkills = profileSkillNames.filter((s) => jobSkillsLower.has(s.toLowerCase()));
  const otherSkills = profileSkillNames.filter((s) => !jobSkillsLower.has(s.toLowerCase()));

  const jobText = `${job.title} ${job.description}`.toLowerCase();

  const reorderedExperiences = [...profile.experiences]
    .map((exp) => {
      const expText = `${exp.title} ${exp.description ?? ""}`.toLowerCase();
      const sharedWords = expText
        .split(/\W+/)
        .filter((w) => w.length > 3 && jobText.includes(w));
      const relevant = sharedWords.length >= 2;
      return {
        experience: exp,
        relevant,
        reason: relevant
          ? `Mots-clés en commun avec l'offre : ${Array.from(new Set(sharedWords)).slice(0, 4).join(", ")}`
          : null,
      };
    })
    .sort((a, b) => Number(b.relevant) - Number(a.relevant));

  const suggestions: string[] = [];
  if (highlightedSkills.length > 0) {
    suggestions.push(
      `Mettez en avant en premier ces compétences déjà présentes dans votre profil et demandées par l'offre : ${highlightedSkills.join(", ")}.`
    );
  } else {
    suggestions.push(
      "Aucune compétence de votre profil ne correspond exactement aux mots-clés de l'offre — vérifiez si vous en avez oublié dans votre profil."
    );
  }
  const relevantCount = reorderedExperiences.filter((e) => e.relevant).length;
  if (relevantCount > 0) {
    suggestions.push(
      `${relevantCount} expérience(s) semblent particulièrement pertinentes pour ce poste : placez-les en tête de votre CV.`
    );
  }
  if (profile.summary) {
    suggestions.push(
      "Adaptez votre résumé de profil pour mentionner explicitement l'intitulé du poste visé."
    );
  }

  return {
    headline: profile.headline || `Candidature — ${job.title}`,
    highlightedSkills,
    otherSkills,
    reorderedExperiences,
    educations: profile.educations,
    suggestions,
  };
}
