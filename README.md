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
- [Ouvrir le site depuis votre téléphone (même Wi-Fi)](#ouvrir-le-site-depuis-votre-téléphone-même-wi-fi)
- [Variables d'environnement](#variables-denvironnement)
- [Sources d'offres réelles](#sources-doffres-réelles)
- [Stockage des CV (local vs S3)](#stockage-des-cv-local-vs-s3)
- [Carte interactive](#carte-interactive)
- [Application installable (PWA)](#application-installable-pwa)
- [Tests](#tests)
- [Sécurité](#sécurité)
- [RGPD](#rgpd)
- [Déploiement en production](#déploiement-en-production)
- [Tableau des limitations](#tableau-des-limitations)

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
les plateformes de déploiement courantes (Neon, Supabase, Railway, Vercel Postgres, RDS...).

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
src/lib/storage/           Stockage de fichiers : driver "local" ou "s3" (voir plus bas)
src/lib/geo/               Distance (haversine) + géocodage avec cache DB et retry
src/components/search/     Carte interactive (Leaflet) et composants de recherche
src/app/api/**             Routes API (une par ressource REST)
src/app/(app)/**           Pages authentifiées (tableau de bord, profil, recherche...)
src/app/manifest.ts        Manifest PWA (installable sur mobile/desktop)
public/sw.js               Service worker minimal (cache des assets statiques uniquement)
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
réelles.

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

C'est tout : ouvrez **http://localhost:3000** dans votre navigateur, créez un compte, importez un
CV. `npm run dev` écoute déjà sur toutes les interfaces réseau (`0.0.0.0`), ce qui permet aussi
l'accès depuis votre téléphone sur le même Wi-Fi (voir section suivante).

Autres commandes utiles :

```bash
npm test                  # tests unitaires (Vitest)
npm run lint               # ESLint
npm run build                # build de production
npm run start                 # lance le build de production (après npm run build)
npm run db:studio            # explorateur de base de données Prisma
npm run refresh:jobs           # relance l'ingestion des sources d'offres
npm run check:alerts             # vérifie les alertes et génère les notifications
```

## Ouvrir le site depuis votre téléphone (même Wi-Fi)

Le serveur de développement écoute déjà sur toutes les interfaces réseau de votre ordinateur, pas
seulement `localhost`. Pour l'ouvrir depuis votre iPhone, Android ou tablette **connecté au même
réseau Wi-Fi que votre ordinateur** :

1. Trouvez l'adresse IP locale de votre ordinateur sur ce Wi-Fi :
   - **Mac** : Réglages Système → Wi-Fi → cliquez sur le réseau connecté → l'adresse IP s'affiche
     (ou dans le Terminal : `ipconfig getifaddr en0`).
   - **Windows** : ouvrez l'invite de commandes et tapez `ipconfig` — cherchez « Adresse IPv4 »
     sous votre adaptateur Wi-Fi (généralement `192.168.x.x`).
   - **Linux** : dans un terminal, `hostname -I` ou `ip addr`.
2. Sur votre téléphone/tablette (connecté au **même** Wi-Fi), ouvrez le navigateur et allez sur
   `http://<adresse-IP-de-votre-ordinateur>:3000` — par exemple `http://192.168.1.42:3000`.
3. Si ça ne se charge pas : le pare-feu de votre ordinateur bloque peut-être le port 3000
   (autorisez Node.js/le port 3000 dans les paramètres de pare-feu Windows Defender ou macOS), ou
   votre routeur isole les appareils entre eux ("AP/client isolation" — désactivable dans les
   paramètres du routeur si besoin).

Ceci ne fonctionne que sur le même réseau local — ce n'est pas un lien partageable avec quelqu'un
en dehors de chez vous (pour ça, voir [Déploiement en production](#déploiement-en-production)).

## Variables d'environnement

Voir `.env.example` pour la liste complète et commentée. Résumé :

- `DATABASE_URL` — connexion PostgreSQL (obligatoire).
- `NEXTAUTH_SECRET` / `NEXTAUTH_URL` — obligatoires pour l'authentification.
- `APP_MODE` — `demo` (défaut) ou `production`. En `production`, l'ingestion utilise toute source
  réelle configurée (France Travail, Adzuna) et active automatiquement RemoteOK (gratuite, sans
  clé) ; si aucune n'est prête, retombe automatiquement sur les données démo.
- `STORAGE_DRIVER` — `local` (défaut) ou `s3` (voir [Stockage des CV](#stockage-des-cv-local-vs-s3)).
- `FRANCE_TRAVAIL_CLIENT_ID` / `_SECRET`, `ADZUNA_APP_ID` / `_KEY` — optionnels, activent des
  sources d'offres réelles supplémentaires.
- `GEOCODING_PROVIDER=ban` — utilise l'API gratuite et sans clé de la Base Adresse Nationale, avec
  mise en cache en base et nouvelle tentative automatique en cas d'échec réseau ponctuel.
- `CRON_SECRET` — protège les endpoints `/api/cron/*` (à appeler depuis votre ordonnanceur).

Aucun secret n'est jamais codé en dur dans le code source.

## Sources d'offres réelles

Le système d'ingestion utilise un pattern adaptateur (`src/lib/jobs/sources/types.ts`,
`JobSourceAdapter`). Chaque source implémente `fetchJobs()` et retourne des offres au format
normalisé commun (`NormalizedJob`). Sont fournis :

- **`demoSource.ts`** — toujours actif, données fictives.
- **`franceTravailSource.ts`** — adaptateur pour l'API publique et gratuite France Travail (ex
  Pôle Emploi). Fonctionnel dès que `FRANCE_TRAVAIL_CLIENT_ID`/`_SECRET` sont renseignés
  (inscription gratuite sur https://francetravail.io → « Utiliser une API » → « Offres d'emploi
  v2 »). Les URLs d'API ont été corrigées lors de l'audit de ce projet — l'ancien domaine
  `pole-emploi.io/.fr` a été remplacé par `francetravail.io/.fr` suite au changement de marque de
  Pôle Emploi. **Non testé contre l'API réelle** dans cet environnement de développement (ni clés,
  ni accès réseau sortant vers ce domaine — voir le commentaire d'honnêteté en tête du fichier).
- **`adzunaSource.ts`** — adaptateur pour l'API Adzuna (couvre la France et ~20 autres pays).
  Inscription instantanée et gratuite sur https://developer.adzuna.com. **Non testé contre l'API
  réelle** pour la même raison que ci-dessus.
- **`remoteOkSource.ts`** — adaptateur pour l'API publique RemoteOK (offres 100% télétravail).
  **Aucune clé requise** — s'active automatiquement dès que `APP_MODE=production`, zéro
  configuration. **Non testé contre l'API réelle** pour la même raison.

Pour ajouter une nouvelle source (un flux partenaire, une autre plateforme...) : créer un fichier
implémentant `JobSourceAdapter`, l'ajouter à `ALL_SOURCES` dans `registry.ts`. Rien d'autre ne
change — la déduplication (`dedup.ts`), la normalisation et le calcul de fraîcheur sont partagés.

Le déclenchement périodique se fait via `npm run refresh:jobs` (cron système) ou en appelant
`POST /api/cron/refresh-jobs` avec l'en-tête `Authorization: Bearer <CRON_SECRET>` depuis un
ordonnanceur hébergé (Vercel Cron, GitHub Actions...).

**Sources envisagées et écartées** (recherchées pendant l'audit) : Indeed et LinkedIn ne proposent
plus d'API publique de recherche d'offres pour ce type d'usage et leurs conditions d'utilisation
interdisent le scraping — non intégrées, conformément à l'interdiction de contourner les
protections techniques d'un site. L'APEC n'a pas d'API publique documentée trouvée lors de la
recherche.

## Stockage des CV (local vs S3)

`STORAGE_DRIVER` choisit le driver, avec la même interface pour les deux :

- **`local`** (défaut) — fichiers sous `./storage/uploads`, en dehors de tout répertoire public,
  servis uniquement via une route authentifiée qui vérifie la propriété du fichier. Simple pour le
  développement local, mais **le disque n'est pas persistant** sur un hébergement serverless
  (Vercel, la plupart des PaaS) : les fichiers disparaissent au redéploiement.
- **`s3`** — implémentation réelle (AWS SDK v3) compatible avec n'importe quel stockage objet de
  type S3 : AWS S3, Cloudflare R2 (10 Go gratuits, recommandé), Backblaze B2, MinIO auto-hébergé...
  Génère des URLs signées à durée limitée (5 minutes) pour le téléchargement direct, sans faire
  transiter le fichier par le serveur applicatif. Réglez `STORAGE_DRIVER=s3` et les variables
  `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (et `S3_ENDPOINT` pour tout ce qui n'est
  pas AWS S3 lui-même).

**Honnêteté** : ce driver S3 n'a pas pu être testé contre un vrai bucket dans cet environnement de
développement (aucun compte S3/R2 ni accès réseau sortant disponibles ici). Le code utilise les
appels standards et documentés du SDK AWS v3 (rien d'exotique) ; validez avec un vrai bucket avant
la mise en production (un import de CV + son ouverture depuis la page profil suffit à vérifier le
cycle complet).

## Carte interactive

La page **Recherche** propose un bouton *Carte* à côté de *Liste* : elle affiche les offres
géolocalisées sur une carte Leaflet/OpenStreetMap, avec un marqueur coloré par score de
compatibilité (vert = très compatible, rouge = peu compatible), une pastille bleue pour votre
propre position, et un popup par offre (titre, entreprise, salaire, lien vers le détail). La carte
recentre et zoome automatiquement sur les résultats affichés.

Aucune clé d'API n'est nécessaire (tuiles OpenStreetMap, gratuites et sans clé). Le clustering de
marqueurs n'est pas implémenté : à l'échelle des données de démo (quelques dizaines d'offres), les
marqueurs individuels restent lisibles ; la bibliothèque de clustering la plus naturelle
(`react-leaflet-cluster`) nécessite React 19, incompatible avec la base React 18 choisie ici pour
sa stabilité — à ajouter plus tard si le volume d'offres réelles grossit significativement.

## Application installable (PWA)

Le site peut être ajouté à l'écran d'accueil sur mobile et installé comme application sur
desktop :

- **iPhone (Safari)** : bouton Partager → « Sur l'écran d'accueil ».
- **Android (Chrome)** : menu ⋮ → « Ajouter à l'écran d'accueil » (ou une bannière d'installation
  apparaît automatiquement).
- **Desktop (Chrome/Edge)** : icône d'installation dans la barre d'adresse.

Un service worker minimal (`public/sw.js`) met uniquement en cache les fichiers statiques
(JS/CSS/icônes) pour accélérer les visites répétées — **jamais** les pages ni les appels `/api/*`,
volontairement : cette application affiche des données vivantes (statut de connexion, offres,
scores) qu'il serait trompeur de servir depuis un cache obsolète. Le site continue de fonctionner
normalement comme site web classique sans jamais nécessiter l'installation.

## Tests

```bash
npm test
```

42 tests unitaires couvrent les moteurs déterministes centraux (matching, extraction de CV,
recherche en langage naturel, adaptateurs de sources d'offres) ainsi que la déduplication, le
géocodage et les schémas de validation, y compris le comportement de personnalisation clé (un
poste à temps plein ne doit pas dépasser un poste à temps partiel compatible pour un profil qui
plafonne ses heures).

Au-delà des tests automatisés, l'ensemble du parcours applicatif a été vérifié manuellement en
conditions réelles pendant le développement : inscription/connexion, création de profil, import et
analyse d'un CV réel (texte → extraction → relecture → fusion dans le profil), recherche classée
par score de compatibilité, recherche en langage naturel, page de détail d'offre avec analyse
personnalisée, génération de lettre de motivation, favoris, suivi de candidature, création
d'alerte et génération de notification, export et suppression de compte, carte interactive,
responsive sur 6 tailles d'écran (petit/grand smartphone, tablette, laptop, grand écran) — le tout
exécuté contre une vraie base PostgreSQL via de vraies requêtes HTTP et des captures d'écran
automatisées (pas de mocks).

## Sécurité

- Mots de passe hachés avec bcrypt (12 rounds), jamais stockés ni journalisés en clair.
- Sessions JWT signées (NextAuth), cookies `httpOnly` + `SameSite=Lax`.
- Toute route API vérifie l'utilisateur authentifié et **filtre systématiquement par son
  identifiant** avant toute lecture/écriture (protection contre les IDOR) — audité explicitement à
  deux reprises pendant le développement (revue initiale + revue de cet audit de finalisation).
- Validation stricte des entrées (Zod) sur chaque route qui accepte un corps de requête.
- Aucune requête SQL brute : tout passe par Prisma (requêtes paramétrées).
- Fichiers de CV stockés hors du répertoire public, servis uniquement via une route authentifiée
  qui vérifie la propriété du fichier (ou une URL S3 signée à durée limitée) ; les clés de
  stockage sont générées côté serveur (`randomUUID`), jamais dérivées d'une entrée utilisateur —
  pas de traversée de chemin possible.
- Limitation de débit en mémoire sur l'inscription et l'import de CV (à remplacer par un store
  partagé de type Redis en cas de déploiement multi-instance — voir commentaire dans
  `src/lib/rateLimit.ts`).
- En-têtes de sécurité (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`) appliqués via le middleware.
- Suppression de compte protégée par re-saisie du mot de passe.
- Endpoints `/api/cron/*` protégés par un secret partagé, avec **échec fermé** si le secret n'est
  pas configuré (corrigé pendant l'audit : la version précédente laissait passer une requête
  envoyant littéralement `Authorization: Bearer undefined` si `CRON_SECRET` n'était jamais défini).

## RGPD

- Consentement explicite (case à cocher, horodaté et versionné) à l'inscription.
- **Droit d'accès et portabilité** : export JSON complet depuis Paramètres → Exporter mes données
  (`GET /api/account/export`).
- **Droit à l'effacement** : suppression définitive du compte et de toutes les données associées
  (cascade en base + suppression des fichiers de CV, sur le driver local comme sur S3) depuis
  Paramètres → Supprimer mon compte (`POST /api/account/delete`, confirmation par mot de passe).
- **Droit de rectification** : profil modifiable à tout moment.
- Politique de confidentialité complète : `/legal/privacy`.
- ⚠️ Le texte de la politique de confidentialité est un document de démonstration — **à faire
  valider par un professionnel du droit avant toute mise en production réelle**, notamment sur la
  durée de conservation exacte, l'éventuel sous-traitant d'hébergement, et la base légale précise
  selon votre juridiction.

## Déploiement en production

**Cet environnement de développement ne peut pas publier d'URL publique lui-même** : son accès
réseau sortant est limité par une politique d'entreprise à une liste très restreinte de domaines
(le registre npm, l'API GitHub...) et bloque explicitement Vercel, Netlify, Railway, Render,
Cloudflare et tout autre hébergeur testé pendant cet audit — ce n'est pas une question de choix
mais une restriction réseau vérifiée directement (`curl` vers ces domaines renvoie une erreur 403
du proxy de sécurité de l'environnement). Aucune URL n'a donc été générée, et il n'en sera présenté
aucune : ce README vous donne à la place la procédure la plus simple pour déployer vous-même,
en quelques minutes, sans connaissances techniques poussées.

### Option recommandée : Vercel + Neon (gratuit pour démarrer)

**1. Base de données (5 min) — [Neon](https://neon.tech)**
   - Créez un compte gratuit, créez un projet.
   - Copiez la « Connection string » (elle ressemble à
     `postgresql://user:password@ep-xxx.neon.tech/dbname?sslmode=require`).

**2. Déploiement de l'application (5 min) — [Vercel](https://vercel.com)**
   - Créez un compte gratuit (le plus simple : « Continue with GitHub »).
   - « Add New… » → « Project » → sélectionnez le dépôt GitHub de ce projet
     (`yassineezzaitab/Site-recherche-emploi`), branche `claude/job-search-platform-e6gioz`
     (ou fusionnez-la sur `main` d'abord si vous préférez déployer depuis `main`).
   - Vercel détecte automatiquement Next.js — ne changez rien aux réglages de build.
   - Avant de cliquer sur « Deploy », ouvrez « Environment Variables » et ajoutez :

     | Variable | Valeur |
     |---|---|
     | `DATABASE_URL` | la chaîne de connexion Neon de l'étape 1 |
     | `NEXTAUTH_SECRET` | une valeur aléatoire — générez-la avec `openssl rand -base64 32` dans un terminal, ou https://generate-secret.vercel.app/32 |
     | `NEXTAUTH_URL` | l'URL Vercel qui vous sera attribuée, ex. `https://votre-projet.vercel.app` (vous pouvez la mettre à jour après le premier déploiement) |
     | `CRON_SECRET` | une autre valeur aléatoire, même méthode |
     | `APP_MODE` | `demo` pour démarrer (passez à `production` une fois des clés de sources réelles ajoutées) |

   - Cliquez sur « Deploy ». Après quelques minutes, Vercel vous donne une URL publique du type
     `https://votre-projet.vercel.app`.

**3. Initialiser la base de données (une seule fois)**
   Sur votre ordinateur, avec `DATABASE_URL` pointée vers Neon dans votre `.env` local :
   ```bash
   npm run db:deploy   # applique les migrations sur la base de production
   npm run db:seed     # dictionnaire de compétences + offres de démonstration
   ```

**4. (Optionnel) Stockage des CV persistant — [Cloudflare R2](https://developers.cloudflare.com/r2/)**
   Sans cette étape, les CV importés fonctionnent mais peuvent être perdus au prochain
   déploiement (disque non persistant sur Vercel). Créez un bucket R2 (10 Go gratuits), générez
   une clé d'API, puis ajoutez dans les variables d'environnement Vercel :
   `STORAGE_DRIVER=s3`, `S3_ENDPOINT` (fourni par Cloudflare), `S3_BUCKET`, `S3_ACCESS_KEY_ID`,
   `S3_SECRET_ACCESS_KEY`.

**5. (Optionnel) Actualisation automatique des offres**
   Dans les réglages du projet Vercel → « Cron Jobs », ajoutez :
   - `POST /api/cron/refresh-jobs` toutes les heures
   - `POST /api/cron/check-alerts` toutes les 15 minutes

   avec l'en-tête `Authorization: Bearer <votre CRON_SECRET>` (Vercel Cron gère cela nativement
   depuis son interface, sans configuration supplémentaire côté code).

À l'issue de ces étapes, l'URL Vercel est **publique et permanente** (tant que le projet Vercel
existe) : n'importe qui avec le lien peut ouvrir le site depuis son téléphone, ordinateur ou
tablette, où qu'il soit — ce n'est plus limité à votre réseau Wi-Fi.

### Alternatives

L'application est un projet Next.js standard sans dépendance à une plateforme précise : Railway,
Render, ou un conteneur Docker sur n'importe quel VPS fonctionnent tout aussi bien — la procédure
est la même dans l'esprit (provisionner Postgres, régler les variables d'environnement, lancer
`npm run build && npm run db:deploy && npm start`).

## Tableau des limitations

| Fonctionnalité | État | Ce qui fonctionne | Ce qui manque |
|---|---|---|---|
| Authentification | 🟢 | Inscription, connexion, déconnexion, sessions JWT, hachage bcrypt, protections IDOR — vérifié par tests + parcours réel | — |
| Import et analyse de CV | 🟢 | PDF/DOCX/TXT, extraction déterministe, relecture/édition, fusion dans le profil — vérifié en conditions réelles | La reconnaissance d'un CV scanné en image (sans texte réel) reste limitée, comme annoncé à l'utilisateur |
| Profil intelligent | 🟢 | Toutes les sections du cahier des charges, CRUD complet | — |
| Moteur de matching | 🟢 | 6 dimensions pondérées, explication, personnalisation testée | — |
| Recherche en langage naturel | 🟢 | Règles déterministes couvrant les exemples du cahier des charges | Vocabulaire non couvert (tournures très inhabituelles) retombe en recherche par mots-clés simples |
| Favoris / candidatures / alertes | 🟢 | CRUD complet, notifications générées, kanban responsive | — |
| Lettre de motivation / adaptation CV | 🟢 | Génération par templates à partir de données réelles | — |
| Offres démo | 🟢 | 24 offres fictives, clairement labellisées `MODE DÉMO` | — |
| France Travail (API réelle) | 🟡 | Adaptateur écrit, URLs corrigées (rebranding), infrastructure d'ingestion testée | Jamais exercé contre l'API réelle (ni clé, ni accès réseau sortant dans cet environnement) |
| Adzuna (API réelle) | 🟡 | Adaptateur écrit à partir de la documentation publique | Jamais exercé contre l'API réelle, même raison |
| RemoteOK (API réelle) | 🟡 | Adaptateur écrit, aucune clé requise | Jamais exercé contre l'API réelle, même raison |
| Stockage S3 | 🟡 | Implémentation réelle (AWS SDK v3), URLs signées, driver local en secours | Jamais exercé contre un vrai bucket (aucun compte disponible ici) |
| Géocodage | 🟢 | API BAN gratuite, cache en base, retry, dégradation propre sans crash | Échoue silencieusement dans un environnement sans accès réseau sortant (comme ce bac à sable) — fonctionne normalement avec un accès Internet standard |
| Carte interactive | 🟢 | Leaflet + OpenStreetMap, marqueurs colorés par score, popups | Pas de clustering (limitation de compatibilité React 18 documentée) ; tuiles non visibles dans les captures d'écran prises depuis ce bac à sable (réseau bloqué), mais fonctionnelles pour un vrai utilisateur |
| PWA / installable | 🟢 | Manifest, icônes, service worker minimal, installable sur iPhone/Android/desktop | — |
| Responsive | 🟢 | Vérifié sur 6 tailles d'écran, aucun débordement horizontal détecté | — |
| Sécurité | 🟢 | Audit dédié effectué, un bug corrigé (auth cron fail-open) | Rate limiting en mémoire (à migrer vers Redis pour un déploiement multi-instance) |
| RGPD | 🟢 | Export, suppression, consentement | Politique de confidentialité à valider juridiquement |
| Déploiement | 🔴 | Projet prêt, build vérifié, procédure documentée étape par étape | **Pas d'URL publique depuis cet environnement** — accès réseau sortant bloqué vers toute plateforme d'hébergement (vérifié directement) ; déploiement à réaliser par vous via la procédure ci-dessus (~10 minutes) |

**Légende** : 🟢 fonctionnel · 🟡 fonctionnel mais partiellement vérifiable dans cet environnement ·
🟠 dégradé/dépendant d'un service externe · 🔴 non réalisable depuis cet environnement.
