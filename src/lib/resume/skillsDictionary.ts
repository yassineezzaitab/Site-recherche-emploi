/**
 * Curated skills dictionary used for deterministic CV parsing and matching.
 *
 * Why a dictionary instead of an LLM call: skill extraction from a CV is a
 * closed-vocabulary classification problem — the same ~1500 tools/frameworks/
 * competencies show up across most French CVs. A curated list matched with
 * word-boundary regexes is instant, free, 100% reproducible, and never
 * hallucinates a skill that isn't in the text. It's also easy to extend.
 * Each entry maps a canonical name to the surface forms/aliases we should
 * recognize in free text (case-insensitive).
 */

export interface SkillDefinition {
  canonical: string;
  category: "technical" | "software" | "soft" | "language";
  aliases: string[];
}

export const SKILLS: SkillDefinition[] = [
  // --- Programming languages / technical ---
  { canonical: "JavaScript", category: "technical", aliases: ["javascript", "js"] },
  { canonical: "TypeScript", category: "technical", aliases: ["typescript", "ts"] },
  { canonical: "Python", category: "technical", aliases: ["python"] },
  { canonical: "Java", category: "technical", aliases: ["java"] },
  { canonical: "C++", category: "technical", aliases: ["c\\+\\+", "cpp"] },
  { canonical: "C#", category: "technical", aliases: ["c#", "csharp"] },
  { canonical: "PHP", category: "technical", aliases: ["php"] },
  { canonical: "SQL", category: "technical", aliases: ["sql"] },
  { canonical: "React", category: "technical", aliases: ["react", "react.js", "reactjs"] },
  { canonical: "Next.js", category: "technical", aliases: ["next.js", "nextjs"] },
  { canonical: "Node.js", category: "technical", aliases: ["node.js", "nodejs", "node"] },
  { canonical: "Vue.js", category: "technical", aliases: ["vue.js", "vuejs", "vue"] },
  { canonical: "Angular", category: "technical", aliases: ["angular"] },
  { canonical: "Django", category: "technical", aliases: ["django"] },
  { canonical: "Flask", category: "technical", aliases: ["flask"] },
  { canonical: "Spring", category: "technical", aliases: ["spring boot", "spring"] },
  { canonical: "Docker", category: "technical", aliases: ["docker"] },
  { canonical: "Kubernetes", category: "technical", aliases: ["kubernetes", "k8s"] },
  { canonical: "AWS", category: "technical", aliases: ["aws", "amazon web services"] },
  { canonical: "Azure", category: "technical", aliases: ["azure"] },
  { canonical: "Git", category: "technical", aliases: ["git", "github", "gitlab"] },
  { canonical: "Linux", category: "technical", aliases: ["linux"] },
  { canonical: "HTML", category: "technical", aliases: ["html", "html5"] },
  { canonical: "CSS", category: "technical", aliases: ["css", "css3"] },
  { canonical: "Machine Learning", category: "technical", aliases: ["machine learning", "apprentissage automatique"] },
  { canonical: "Data Analysis", category: "technical", aliases: ["analyse de données", "data analysis"] },
  { canonical: "Réseaux", category: "technical", aliases: ["réseaux informatiques", "networking", "tcp/ip"] },
  { canonical: "CAO/DAO", category: "technical", aliases: ["cao", "dao", "autocad", "solidworks", "catia"] },
  { canonical: "Électronique", category: "technical", aliases: ["électronique", "electronique", "conception électronique"] },
  { canonical: "Arduino", category: "technical", aliases: ["arduino"] },
  { canonical: "Maintenance", category: "technical", aliases: ["maintenance industrielle", "maintenance électronique", "maintenance"] },
  { canonical: "Électrotechnique", category: "technical", aliases: ["électrotechnique", "electrotechnique"] },
  { canonical: "Automatisme", category: "technical", aliases: ["automatisme", "automate programmable"] },
  { canonical: "Programmation", category: "technical", aliases: ["programmation informatique", "programmation embarquée", "programmation"] },
  { canonical: "Soudure", category: "technical", aliases: ["soudure", "brasage"] },
  { canonical: "Comptabilité", category: "technical", aliases: ["comptabilité", "comptable"] },
  { canonical: "Gestion de projet", category: "technical", aliases: ["gestion de projet", "chef de projet", "project management"] },
  { canonical: "Marketing digital", category: "technical", aliases: ["marketing digital", "growth marketing", "seo", "sea", "sem"] },
  { canonical: "Vente", category: "technical", aliases: ["vente", "techniques de vente", "négociation commerciale"] },
  { canonical: "Cuisine", category: "technical", aliases: ["cuisine", "pâtisserie", "restauration"] },
  { canonical: "Service client", category: "technical", aliases: ["service client", "relation client", "service à la clientèle"] },
  { canonical: "Logistique", category: "technical", aliases: ["logistique", "supply chain"] },
  { canonical: "Caisse", category: "technical", aliases: ["tenue de caisse", "caisse enregistreuse", "encaissement"] },
  { canonical: "Permis B", category: "technical", aliases: ["permis b", "permis de conduire"] },

  // --- Software / tools ---
  { canonical: "Excel", category: "software", aliases: ["excel", "microsoft excel"] },
  { canonical: "Word", category: "software", aliases: ["word", "microsoft word"] },
  { canonical: "PowerPoint", category: "software", aliases: ["powerpoint"] },
  { canonical: "Photoshop", category: "software", aliases: ["photoshop"] },
  { canonical: "Illustrator", category: "software", aliases: ["illustrator"] },
  { canonical: "Figma", category: "software", aliases: ["figma"] },
  { canonical: "SAP", category: "software", aliases: ["sap"] },
  { canonical: "Salesforce", category: "software", aliases: ["salesforce"] },
  { canonical: "WordPress", category: "software", aliases: ["wordpress"] },
  { canonical: "Notion", category: "software", aliases: ["notion"] },
  { canonical: "Jira", category: "software", aliases: ["jira"] },

  // --- Soft skills ---
  { canonical: "Travail d'équipe", category: "soft", aliases: ["travail d'équipe", "esprit d'équipe", "team player"] },
  { canonical: "Autonomie", category: "soft", aliases: ["autonome", "autonomie"] },
  { canonical: "Rigueur", category: "soft", aliases: ["rigueur", "rigoureux"] },
  { canonical: "Communication", category: "soft", aliases: ["communication", "aisance orale", "aisance relationnelle"] },
  { canonical: "Adaptabilité", category: "soft", aliases: ["adaptabilité", "flexibilité", "polyvalence", "polyvalent"] },
  { canonical: "Organisation", category: "soft", aliases: ["organisation", "sens de l'organisation"] },
  { canonical: "Leadership", category: "soft", aliases: ["leadership", "management d'équipe"] },
  { canonical: "Créativité", category: "soft", aliases: ["créativité", "créatif"] },
  { canonical: "Sens du relationnel", category: "soft", aliases: ["sens du contact", "relationnel", "empathie"] },
  { canonical: "Gestion du stress", category: "soft", aliases: ["gestion du stress", "résistance au stress"] },
  { canonical: "Ponctualité", category: "soft", aliases: ["ponctuel", "ponctualité", "fiable", "fiabilité"] },
];

export const LANGUAGE_NAMES: { canonical: string; aliases: string[] }[] = [
  { canonical: "Français", aliases: ["français", "francais", "french"] },
  { canonical: "Anglais", aliases: ["anglais", "english"] },
  { canonical: "Espagnol", aliases: ["espagnol", "spanish"] },
  { canonical: "Allemand", aliases: ["allemand", "german", "deutsch"] },
  { canonical: "Italien", aliases: ["italien", "italian"] },
  { canonical: "Portugais", aliases: ["portugais", "portuguese"] },
  { canonical: "Arabe", aliases: ["arabe", "arabic"] },
  { canonical: "Chinois", aliases: ["chinois", "mandarin", "chinese"] },
  { canonical: "Néerlandais", aliases: ["néerlandais", "dutch", "hollandais"] },
  { canonical: "Russe", aliases: ["russe", "russian"] },
];

export const LANGUAGE_LEVEL_PATTERNS: { regex: RegExp; level: string }[] = [
  { regex: /\b(natif|native|langue maternelle|bilingue)\b/i, level: "Natif / bilingue" },
  { regex: /\bc2\b/i, level: "C2" },
  { regex: /\bc1\b/i, level: "C1" },
  { regex: /\b(courant|fluent)\b/i, level: "Courant (C1)" },
  { regex: /\bb2\b/i, level: "B2" },
  { regex: /\b(intermédiaire|intermediate)\b/i, level: "Intermédiaire (B1)" },
  { regex: /\bb1\b/i, level: "B1" },
  { regex: /\ba2\b/i, level: "A2" },
  { regex: /\b(notions|débutant|basic|basique)\b/i, level: "Notions (A1-A2)" },
  { regex: /\ba1\b/i, level: "A1" },
  { regex: /\bscolaire\b/i, level: "Scolaire" },
  { regex: /\btoeic\b/i, level: "TOEIC" },
];
