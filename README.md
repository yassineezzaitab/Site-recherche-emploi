# JobMatch — plateforme intelligente de recherche d'emploi

Une plateforme web qui importe et analyse un CV, construit un profil professionnel structuré,
puis classe des offres d'emploi selon leur compatibilité réelle avec ce profil (compétences,
horaires, distance, salaire, type de contrat) — pas juste un agrégateur d'annonces.

> **Mode démo actif par défaut.** Sans clés d'API externes, l'application tourne entièrement sur
> des offres d'emploi fictives clairement labellisées `MODE DÉMO`. Toute l'infrastructure pour
> brancher de vraies sources est en place (voir [Sources d'offres réelles](#sources-doffres-réelles)).

## Sommaire

- [Architecture](#architecture)
- [Comment fonctionne le matching](#comment-fonctionne-le-moteur-de-matching)
- [Comment fonctionne l'analyse de CV](#comment-fonctionne-lanalyse-de-cv)
- [Démarrage local](#démarrage-local)
- [Variables d'environnement](#variables-denvironnement)
- [Sources d'offres réelles](#sources-doffres-réelles)
- [Tests](#tests)
- [Sécurité](#sécurité)
- [RGPD](#rgpd)
- [Déploiement](#déploiement)
- [Limites connues](#limites-connues--ce-quil-reste-à-connecter)

## Architecture

**Stack : Next.js 15 (App Router) + TypeScript + PostgreSQL (Prisma) + NextAuth + Tailwind CSS.**

Un seul codebase full-stack : les routes `src/app/api/**/route.ts` servent d'API backend, les
pages `src/app/**/page.tsx` servent de frontend. Ce choix réduit la complexité de déploiement
(un seul process, pas de CORS à gérer) tout en gardant une séparation nette entre logique métier
(`src/lib/**`, testable indépendamment de HTTP) et couche HTTP (les route handlers, qui restent
volontairement fins : validation → appel à `src/lib` → réponse).

**Pourquoi PostgreSQL.** Le modèle de données est fortement relationnel (utilisateurs ↔ profils ↔
CV ↔ compétences ↔ offres ↔ correspondances ↔ candidatures) avec des contraintes d'intégrité
importantes (suppression en cascade pour le droit à l'effacement RGPD, unicité par utilisateur+
offre pour éviter les doublons de candidature). Postgres offre en plus des colonnes JSON pour les
données semi-structurées (résultat d'extraction de CV, détail du score de matching) sans sacrifier
les garanties relationnelles. C'est gratuit, auto-hébergeable, et supporté nativement par toutes
les plateformes de déploiement courantes (Vercel Postgres, Supabase, Railway, RDS...).

**Pourquoi pas plus d'IA (LLM) que nécessaire.** Trois moteurs déterministes remplacent des appels
à un LLM externe :

| Besoin | Approche | Pourquoi |
|---|---|---|
| Extraction de CV | Dictionnaire de compétences + regex + découpage par sections | Vocabulaire fermé, zéro hallucination possible, gratuit, instantané |
| Score de compatibilité | Pondération de 6 dimensions + similarité lexicale (TF-IDF cosinus) | Explicable, reproductible, pas de dépendance à une clé API |
| Recherche en langage naturel | Règles regex ciblées (heures, jours, distance, salaire...) | Le vocabulaire des contraintes de recherche d'emploi en français est petit et très patterné |

Aucune clé d'API IA (OpenAI, Anthropic...) n'est nécessaire pour faire fonctionner l'application.
La génération de lettre de motivation et l'adaptation de CV sont elles aussi **basées sur des
templates remplis avec les données réelles du profil** — jamais de génération libre, donc jamais
d'invention d'expérience ou de compétence.

### Structure du projet

```
prisma/schema.prisma       Modèle de données complet (voir commentaires inline)
prisma/seed.ts             Seed : dictionnaire de compétences + offres démo
src/lib/resume/            Extraction de texte (PDF/DOCX/TXT) + analyseur déterministe
src/lib/matching/          Moteur de scoring (engine.ts) + mappers Prisma → moteur
src/lib/nlp/               Parseur de requêtes en langage naturel
src/lib/jobs/sources/      Pattern adaptateur pour les sources d'offres (types.ts = interface)
src/lib/jobs/ingest.ts     Orchestrateur d'ingestion : dédoublonnage + fraîcheur
src/lib/generation/        Génération de lettre de motivation / adaptation de CV (templates)
src/lib/storage/           Abstraction de stockage de fichiers (local, extensible vers S3)
src/app/api/**             Routes API (une par ressource REST)
src/app/(app)/**           Pages authentifiées (tableau de bord, profil, recherche...)
tests/                     Tests unitaires (Vitest) des moteurs métier
scripts/                   Scripts CLI : refresh-jobs.ts, check-alerts.ts
```

## Comment fonctionne le moteur de matching

Voir `src/lib/matching/engine.ts` (commenté en détail). Le score global (0-100%) est une somme
pondérée de 6 dimensions indépendantes, chacune notée 0-100 :

| Dimension | Poids | Logique |
|---|---|---|
| Compétences | 30% | Recouvrement exact (Jaccard) + similarité lexicale du texte |
| Volume horaire | 18% | **Pénalise fortement** un poste dont les heures dépassent le maximum déclaré par l'utilisateur |
| Localisation | 18% | Distance réelle (formule de haversine) ou score neutre si télétravail total |
| Type de contrat | 12% | Correspondance avec les types recherchés |
| Niveau d'expérience | 12% | Écart entre niveau demandé et niveau du profil |
| Rémunération | 10% | Salaire normalisé au mois vs. minimum souhaité |

**Point clé de personnalisation** (voir `tests/matching.test.ts`) : un poste à temps plein très
compatible en compétences ne doit jamais dépasser un poste à temps partiel réellement compatible
pour un profil qui plafonne ses heures — c'est testé explicitement et vérifié en conditions
réelles (voir capture d'écran du tableau de bord dans la démo).

Chaque score est accompagné d'une explication textuelle (`strengths`/`weaknesses`/`advice`)
générée à partir des mêmes calculs, jamais par un texte libre généré séparément.

## Comment fonctionne l'analyse de CV

Voir `src/lib/resume/parseResume.ts`. Le texte est extrait (`pdf-parse` / `mammoth` / lecture
brute) puis découpé en sections (expérience, formation, compétences, langues, certifications) par
repérage d'en-têtes typiques d'un CV français. Chaque compétence détectée est un **match littéral**
contre un dictionnaire curé (`src/lib/resume/skillsDictionary.ts`) — rien n'est jamais inventé.
Les dates sont parsées avec un jeu de regex tolérant les formats français ("juin 2023", "06/2023",
"2023"). Le résultat est présenté à l'utilisateur pour relecture/correction avant d'être
enregistré dans son profil (`src/components/profile/ExtractionReview.tsx`).

## Démarrage local

Prérequis : Node.js 20+, PostgreSQL 14+.

```bash
cp .env.example .env
# éditez .env : DATABASE_URL, NEXTAUTH_SECRET (openssl rand -base64 32), CRON_SECRET

npm install
npm run db:migrate     # applique le schéma
npm run db:seed        # dictionnaire de compétences + offres de démonstration
npm run dev            # http://localhost:3000
```

Autres commandes utiles :

```bash
npm test                  # tests unitaires (Vitest)
npm run lint               # ESLint
npm run build               # build de production
npm run db:studio            # explorateur de base de données Prisma
npm run refresh:jobs           # relance l'ingestion des sources d'offres
npm run check:alerts             # vérifie les alertes et génère les notifications
```

## Variables d'environnement

Voir `.env.example` pour la liste complète et commentée. Résumé :

- `DATABASE_URL` — connexion PostgreSQL (obligatoire).
- `NEXTAUTH_SECRET` / `NEXTAUTH_URL` — obligatoires pour l'authentification.
- `APP_MODE` — `demo` (défaut) ou `production`. En `production`, l'ingestion utilise les vraies
  sources configurées et retombe automatiquement sur les données démo si aucune n'est prête.
- `STORAGE_DRIVER` — `local` (défaut, stockage sur disque hors répertoire public) ; `s3` est prévu
  dans l'interface mais non implémenté (voir [Limites connues](#limites-connues--ce-quil-reste-à-connecter)).
- `FRANCE_TRAVAIL_CLIENT_ID` / `_SECRET`, `ADZUNA_APP_ID` / `_KEY` — optionnels, activent des
  sources d'offres réelles.
- `GEOCODING_PROVIDER=ban` — utilise l'API gratuite et sans clé de la Base Adresse Nationale.
- `CRON_SECRET` — protège les endpoints `/api/cron/*` (à appeler depuis votre ordonnanceur).

Aucun secret n'est jamais codé en dur dans le code source.

## Sources d'offres réelles

Le système d'ingestion utilise un pattern adaptateur (`src/lib/jobs/sources/types.ts`,
`JobSourceAdapter`). Chaque source implémente `fetchJobs()` et retourne des offres au format
normalisé commun (`NormalizedJob`). Sont fournis :

- **`demoSource.ts`** — toujours actif, données fictives.
- **`franceTravailSource.ts`** — adaptateur réel pour l'API publique et gratuite France Travail
  (ex Pôle Emploi). Fonctionnel dès que `FRANCE_TRAVAIL_CLIENT_ID`/`_SECRET` sont renseignés
  (inscription gratuite sur https://pole-emploi.io). **Non testé en conditions réelles dans cet
  environnement** (aucune clé disponible) — voir le commentaire d'honnêteté en tête du fichier.

Pour ajouter une nouvelle source (Adzuna, un flux partenaire...) : créer un fichier implémentant
`JobSourceAdapter`, l'ajouter à `ALL_SOURCES` dans `registry.ts`. Rien d'autre ne change — la
déduplication (`dedup.ts`), la normalisation et le calcul de fraîcheur sont partagés.

Le déclenchement périodique se fait via `npm run refresh:jobs` (cron système) ou en appelant
`POST /api/cron/refresh-jobs` avec l'en-tête `Authorization: Bearer <CRON_SECRET>` depuis un
ordonnanceur hébergé (Vercel Cron, GitHub Actions...).

## Tests

```bash
npm test
```

35 tests unitaires couvrent les trois moteurs déterministes centraux (matching, extraction de CV,
recherche en langage naturel) ainsi que la déduplication et les schémas de validation, y compris
le comportement de personnalisation clé (un poste à temps plein ne doit pas dépasser un poste à
temps partiel compatible pour un profil qui plafonne ses heures).

Au-delà des tests automatisés, l'ensemble du parcours applicatif a été vérifié manuellement en
conditions réelles pendant le développement : inscription/connexion, création de profil,
import et analyse d'un CV réel (texte → extraction → relecture → fusion dans le profil),
recherche classée par score de compatibilité, recherche en langage naturel, page de détail
d'offre avec analyse personnalisée, génération de lettre de motivation, favoris, suivi de
candidature, création d'alerte et génération de notification, export et suppression de compte —
le tout exécuté contre une vraie base PostgreSQL via de vraies requêtes HTTP (pas de mocks).

## Sécurité

- Mots de passe hachés avec bcrypt (12 rounds), jamais stockés ni journalisés en clair.
- Sessions JWT signées (NextAuth), cookies `httpOnly` + `SameSite=Lax`.
- Toute route API vérifie l'utilisateur authentifié et **filtre systématiquement par son
  identifiant** avant toute lecture/écriture (protection contre les IDOR) — audité explicitement,
  voir revue de sécurité effectuée pendant le développement.
- Validation stricte des entrées (Zod) sur chaque route qui accepte un corps de requête.
- Aucune requête SQL brute : tout passe par Prisma (requêtes paramétrées).
- Fichiers de CV stockés hors du répertoire public, servis uniquement via une route authentifiée
  qui vérifie la propriété du fichier ; les clés de stockage sont générées côté serveur
  (`randomUUID`), jamais dérivées d'une entrée utilisateur — pas de traversée de chemin possible.
- Limitation de débit en mémoire sur l'inscription et l'import de CV (à remplacer par un store
  partagé de type Redis en cas de déploiement multi-instance — voir commentaire dans
  `src/lib/rateLimit.ts`).
- En-têtes de sécurité (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`) appliqués via le middleware.
- Suppression de compte protégée par re-saisie du mot de passe.
- Endpoints `/api/cron/*` protégés par un secret partagé, avec échec fermé si le secret n'est pas
  configuré.

## RGPD

- Consentement explicite (case à cocher, horodaté et versionné) à l'inscription.
- **Droit d'accès et portabilité** : export JSON complet depuis Paramètres → Exporter mes données
  (`GET /api/account/export`).
- **Droit à l'effacement** : suppression définitive du compte et de toutes les données associées
  (cascade en base + suppression des fichiers de CV) depuis Paramètres → Supprimer mon compte
  (`POST /api/account/delete`, confirmation par mot de passe).
- **Droit de rectification** : profil modifiable à tout moment.
- Politique de confidentialité complète : `/legal/privacy`.
- ⚠️ Le texte de la politique de confidentialité est un document de démonstration — **à faire
  valider par un professionnel du droit avant toute mise en production réelle**, notamment sur la
  durée de conservation exacte, l'éventuel sous-traitant d'hébergement, et la base légale précise
  selon votre juridiction.

## Déploiement

L'application est un projet Next.js standard, déployable sur Vercel, un conteneur Docker, ou tout
hébergeur Node.js :

1. Provisionner une base PostgreSQL et renseigner `DATABASE_URL`.
2. Renseigner `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (URL publique du site) et `CRON_SECRET`.
3. `npm run db:deploy` (applique les migrations en production, sans interaction).
4. `npm run build && npm start`, ou laisser la plateforme construire automatiquement.
5. Planifier `POST /api/cron/refresh-jobs` et `POST /api/cron/check-alerts` (avec l'en-tête
   `Authorization: Bearer <CRON_SECRET>`) sur un ordonnanceur externe (ex. Vercel Cron toutes les
   heures pour le premier, toutes les 15 minutes pour le second).
6. Pour du stockage de fichiers persistant hors disque local (recommandé en production
   serverless), implémenter le driver `s3` dans `src/lib/storage/fileStorage.ts` et régler
   `STORAGE_DRIVER=s3` avec les variables `S3_*`.

## Limites connues — ce qu'il reste à connecter

Honnêtement documenté plutôt que caché :

- **Sources d'offres réelles** : seul l'adaptateur France Travail est écrit, et il n'a pas pu être
  testé contre l'API réelle dans cet environnement de développement (pas de clés disponibles, pas
  d'accès réseau sortant vers ce domaine dans le bac à sable). L'infrastructure d'ingestion,
  dédoublonnage et normalisation fonctionne (testée avec la source démo) ; le mapping exact des
  champs de la réponse France Travail est à vérifier avant mise en production.
- **Stockage S3** : l'interface (`fileStorage.ts`) est prête, l'implémentation ne l'est pas — le
  stockage local fonctionne mais n'est pas persistant sur un hébergement serverless.
- **Géocodage** : l'appel à l'API BAN (gratuite, sans clé) échoue silencieusement dans les
  environnements sans accès réseau sortant (comme le bac à sable utilisé pour construire ce
  projet) — le matching par distance fonctionne alors en mode dégradé (score neutre) tant que les
  coordonnées ne sont pas résolues. Fonctionne normalement avec un accès Internet standard.
- **Politique de confidentialité** : contenu de démonstration, nécessite une relecture juridique.
- **Carte interactive** (§21 du cahier des charges) : les données de géolocalisation (latitude/
  longitude sur profils et offres) sont en place, mais l'intégration d'une bibliothèque de carte
  (Leaflet/MapLibre) n'a pas été ajoutée — c'est une extension frontend simple à greffer sur les
  données existantes.
