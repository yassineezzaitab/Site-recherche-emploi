/**
 * Curated dictionary of real French diplomas/formations for search
 * autocomplete (BTS, BUT, licences, masters, écoles d'ingénieur generalist
 * tracks). Not exhaustive, but every entry here is a genuine French
 * qualification — nothing invented.
 */

export interface FormationDefinition {
  canonical: string;
  level: string;
  aliases: string[];
}

export const FORMATIONS: FormationDefinition[] = [
  // --- BTS (real, commonly-searched titles) ---
  { canonical: "BTS Management Commercial Opérationnel (MCO)", level: "BTS", aliases: ["bts mco", "bts management commercial"] },
  { canonical: "BTS Négociation et Digitalisation de la Relation Client (NDRC)", level: "BTS", aliases: ["bts ndrc", "bts négociation"] },
  { canonical: "BTS Comptabilité et Gestion (CG)", level: "BTS", aliases: ["bts cg", "bts comptabilité"] },
  { canonical: "BTS Support à l'Action Managériale (SAM)", level: "BTS", aliases: ["bts sam"] },
  { canonical: "BTS Communication", level: "BTS", aliases: ["bts communication"] },
  { canonical: "BTS Services Informatiques aux Organisations (SIO)", level: "BTS", aliases: ["bts sio", "bts informatique"] },
  { canonical: "BTS Assurance", level: "BTS", aliases: ["bts assurance"] },
  { canonical: "BTS Banque", level: "BTS", aliases: ["bts banque"] },
  { canonical: "BTS Tourisme", level: "BTS", aliases: ["bts tourisme"] },
  { canonical: "BTS Professions Immobilières", level: "BTS", aliases: ["bts professions immobilières", "bts immobilier"] },
  { canonical: "BTS Diététique", level: "BTS", aliases: ["bts diététique"] },
  { canonical: "BTS Design Graphique", level: "BTS", aliases: ["bts design graphique"] },

  // --- BUT (real IUT tracks) ---
  { canonical: "BUT Informatique", level: "BUT", aliases: ["but informatique"] },
  { canonical: "BUT Gestion des Entreprises et des Administrations (GEA)", level: "BUT", aliases: ["but gea", "but gestion des entreprises"] },
  { canonical: "BUT Techniques de Commercialisation (TC)", level: "BUT", aliases: ["but tc", "but commercialisation"] },
  { canonical: "BUT Génie Civil - Construction Durable", level: "BUT", aliases: ["but génie civil"] },
  { canonical: "BUT Génie Électrique et Informatique Industrielle (GEII)", level: "BUT", aliases: ["but geii", "but génie électrique"] },
  { canonical: "BUT Réseaux et Télécommunications", level: "BUT", aliases: ["but réseaux et télécommunications"] },
  { canonical: "BUT Carrières Juridiques", level: "BUT", aliases: ["but carrières juridiques"] },
  { canonical: "BUT Statistique et Informatique Décisionnelle", level: "BUT", aliases: ["but statistique"] },
  { canonical: "BUT Métiers du Multimédia et de l'Internet (MMI)", level: "BUT", aliases: ["but mmi", "but multimédia"] },

  // --- Licences ---
  { canonical: "Licence Informatique", level: "Licence", aliases: ["licence informatique"] },
  { canonical: "Licence Économie-Gestion", level: "Licence", aliases: ["licence économie-gestion", "licence économie gestion"] },
  { canonical: "Licence Droit", level: "Licence", aliases: ["licence droit"] },
  { canonical: "Licence Lettres Modernes", level: "Licence", aliases: ["licence lettres modernes"] },
  { canonical: "Licence Sciences de Gestion", level: "Licence", aliases: ["licence sciences de gestion"] },
  { canonical: "Licence Professionnelle Marketing Digital", level: "Licence Pro", aliases: ["licence pro marketing digital"] },
  { canonical: "Licence Professionnelle Ressources Humaines", level: "Licence Pro", aliases: ["licence pro rh", "licence professionnelle ressources humaines"] },
  { canonical: "Licence STAPS", level: "Licence", aliases: ["licence staps"] },
  { canonical: "Licence Psychologie", level: "Licence", aliases: ["licence psychologie"] },

  // --- Masters ---
  { canonical: "Master Informatique", level: "Master", aliases: ["master informatique"] },
  { canonical: "Master Marketing et Vente", level: "Master", aliases: ["master marketing", "master marketing et vente"] },
  { canonical: "Master Management", level: "Master", aliases: ["master management"] },
  { canonical: "Master Data Science", level: "Master", aliases: ["master data science"] },
  { canonical: "Master Droit des Affaires", level: "Master", aliases: ["master droit des affaires"] },
  { canonical: "Master Ressources Humaines", level: "Master", aliases: ["master ressources humaines", "master rh"] },
  { canonical: "Master Finance", level: "Master", aliases: ["master finance"] },

  // --- Écoles d'ingénieur (généraliste) ---
  { canonical: "Diplôme d'ingénieur généraliste", level: "Ingénieur", aliases: ["ingénieur généraliste", "école d'ingénieur"] },
  { canonical: "Diplôme d'ingénieur informatique", level: "Ingénieur", aliases: ["ingénieur informatique"] },
  { canonical: "Diplôme d'ingénieur civil", level: "Ingénieur", aliases: ["ingénieur civil", "ingénieur du génie civil"] },

  // --- Écoles de commerce ---
  { canonical: "Programme Grande École (Bachelor / Master)", level: "École de commerce", aliases: ["programme grande école", "bachelor commerce"] },
];
