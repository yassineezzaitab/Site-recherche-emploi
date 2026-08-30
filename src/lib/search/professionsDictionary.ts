/**
 * Curated profession/job-title dictionary for search autocomplete.
 *
 * Same rationale as skillsDictionary.ts: profession suggestion is a
 * closed-vocabulary problem, so a curated list matched by prefix is
 * instant, free, and never invents a job title that doesn't exist. Titles
 * here are real, commonly-used French job titles (not ROME-code-exhaustive,
 * but genuine).
 */

export interface ProfessionDefinition {
  canonical: string;
  category: string;
  aliases: string[];
}

export const PROFESSIONS: ProfessionDefinition[] = [
  // --- Commerce / vente / caisse ---
  { canonical: "Hôte / Hôtesse de caisse", category: "Commerce", aliases: ["hôte de caisse", "hôtesse de caisse", "caissier", "caissière"] },
  { canonical: "Hôte / Hôtesse d'accueil", category: "Commerce", aliases: ["hôte d'accueil", "hôtesse d'accueil", "agent d'accueil"] },
  { canonical: "Vendeur / Vendeuse", category: "Commerce", aliases: ["vendeur", "vendeuse"] },
  { canonical: "Vendeur / Vendeuse en prêt-à-porter", category: "Commerce", aliases: ["vendeur prêt-à-porter", "vendeuse prêt-à-porter"] },
  { canonical: "Conseiller / Conseillère de vente", category: "Commerce", aliases: ["conseiller de vente", "conseillère de vente", "conseiller commercial"] },
  { canonical: "Employé / Employée libre-service", category: "Commerce", aliases: ["employé libre-service", "employée libre-service", "mise en rayon"] },
  { canonical: "Responsable de magasin", category: "Commerce", aliases: ["responsable magasin", "store manager"] },
  { canonical: "Merchandiser", category: "Commerce", aliases: ["merchandiser", "visual merchandiser"] },

  // --- Restauration / hôtellerie ---
  { canonical: "Serveur / Serveuse", category: "Restauration", aliases: ["serveur", "serveuse"] },
  { canonical: "Commis de cuisine", category: "Restauration", aliases: ["commis de cuisine", "commis cuisinier"] },
  { canonical: "Cuisinier / Cuisinière", category: "Restauration", aliases: ["cuisinier", "cuisinière"] },
  { canonical: "Barman / Barmaid", category: "Restauration", aliases: ["barman", "barmaid", "bartender"] },
  { canonical: "Employé / Employée polyvalent(e) de restauration", category: "Restauration", aliases: ["employé polyvalent restauration", "équipier restauration", "équipière restauration"] },
  { canonical: "Réceptionniste", category: "Hôtellerie", aliases: ["réceptionniste", "réceptionniste hôtel"] },
  { canonical: "Femme / Valet de chambre", category: "Hôtellerie", aliases: ["femme de chambre", "valet de chambre"] },

  // --- Tech / développement ---
  { canonical: "Développeur web", category: "Tech", aliases: ["développeur web", "developpeur web"] },
  { canonical: "Développeur frontend", category: "Tech", aliases: ["développeur frontend", "développeur front-end", "developpeur frontend"] },
  { canonical: "Développeur backend", category: "Tech", aliases: ["développeur backend", "développeur back-end", "developpeur backend"] },
  { canonical: "Développeur full-stack", category: "Tech", aliases: ["développeur full-stack", "développeur fullstack", "developpeur full stack"] },
  { canonical: "Développeur mobile", category: "Tech", aliases: ["développeur mobile", "développeur ios", "développeur android"] },
  { canonical: "Data analyst", category: "Tech", aliases: ["data analyst", "analyste de données"] },
  { canonical: "Data scientist", category: "Tech", aliases: ["data scientist"] },
  { canonical: "Administrateur système", category: "Tech", aliases: ["administrateur système", "sysadmin"] },
  { canonical: "Chef de projet digital", category: "Tech", aliases: ["chef de projet digital", "chef de projet web"] },
  { canonical: "Testeur / Testeuse QA", category: "Tech", aliases: ["testeur qa", "testeuse qa", "quality assurance"] },

  // --- Marketing / communication ---
  { canonical: "Assistant / Assistante marketing", category: "Marketing", aliases: ["assistant marketing", "assistante marketing"] },
  { canonical: "Chargé / Chargée de marketing", category: "Marketing", aliases: ["chargé de marketing", "chargée de marketing"] },
  { canonical: "Responsable marketing", category: "Marketing", aliases: ["responsable marketing"] },
  { canonical: "Chargé / Chargée de marketing digital", category: "Marketing", aliases: ["chargé de marketing digital", "chargée de marketing digital", "marketing digital"] },
  { canonical: "Community manager", category: "Marketing", aliases: ["community manager", "community management"] },
  { canonical: "Chargé / Chargée de communication", category: "Marketing", aliases: ["chargé de communication", "chargée de communication"] },
  { canonical: "Growth marketer", category: "Marketing", aliases: ["growth marketer", "growth marketing"] },

  // --- Administratif / gestion ---
  { canonical: "Assistant / Assistante administratif(ve)", category: "Administratif", aliases: ["assistant administratif", "assistante administrative"] },
  { canonical: "Secrétaire", category: "Administratif", aliases: ["secrétaire"] },
  { canonical: "Assistant / Assistante RH", category: "Administratif", aliases: ["assistant rh", "assistante rh", "assistant ressources humaines"] },
  { canonical: "Chargé / Chargée de recrutement", category: "Administratif", aliases: ["chargé de recrutement", "chargée de recrutement"] },
  { canonical: "Comptable", category: "Administratif", aliases: ["comptable", "aide-comptable"] },
  { canonical: "Assistant / Assistante comptable", category: "Administratif", aliases: ["assistant comptable", "assistante comptable"] },

  // --- Logistique / manutention ---
  { canonical: "Agent / Agente logistique", category: "Logistique", aliases: ["agent logistique", "agente logistique"] },
  { canonical: "Préparateur / Préparatrice de commandes", category: "Logistique", aliases: ["préparateur de commandes", "préparatrice de commandes"] },
  { canonical: "Cariste", category: "Logistique", aliases: ["cariste"] },
  { canonical: "Magasinier / Magasinière", category: "Logistique", aliases: ["magasinier", "magasinière"] },
  { canonical: "Livreur / Livreuse", category: "Logistique", aliases: ["livreur", "livreuse"] },
  { canonical: "Chauffeur-livreur / Chauffeuse-livreuse", category: "Logistique", aliases: ["chauffeur-livreur", "chauffeur livreur"] },

  // --- Service à la personne / animation ---
  { canonical: "Animateur / Animatrice", category: "Animation", aliases: ["animateur", "animatrice", "animateur socioculturel"] },
  { canonical: "Baby-sitter / Garde d'enfants", category: "Services", aliases: ["baby-sitter", "garde d'enfants", "babysitting"] },
  { canonical: "Auxiliaire de vie", category: "Services", aliases: ["auxiliaire de vie"] },
  { canonical: "Professeur particulier / Répétiteur", category: "Éducation", aliases: ["professeur particulier", "répétiteur", "soutien scolaire"] },
  { canonical: "Surveillant / Surveillante (établissement scolaire)", category: "Éducation", aliases: ["surveillant scolaire", "surveillante scolaire", "assistant d'éducation"] },

  // --- Autres ---
  { canonical: "Agent / Agente d'entretien", category: "Services", aliases: ["agent d'entretien", "agente d'entretien", "femme de ménage"] },
  { canonical: "Agent de sécurité", category: "Sécurité", aliases: ["agent de sécurité", "vigile"] },
  { canonical: "Hôte / Hôtesse d'événementiel", category: "Événementiel", aliases: ["hôte événementiel", "hôtesse événementielle", "job événementiel"] },
  { canonical: "Enquêteur / Enquêtrice terrain", category: "Études", aliases: ["enquêteur terrain", "enquêtrice terrain"] },
];
