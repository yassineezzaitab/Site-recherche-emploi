import type { JobSourceAdapter, NormalizedJob } from "./types";

/**
 * France Travail (ex Pôle Emploi) "Offres d'emploi" public API adapter.
 *
 * This is a real, free, official API — not a scrape. Register a partner
 * application at https://francetravail.io (create an account, then
 * "Utiliser une API" → "Offres d'emploi v2") to get a client id/secret,
 * then set FRANCE_TRAVAIL_CLIENT_ID and FRANCE_TRAVAIL_CLIENT_SECRET.
 * Until those are set, isConfigured() returns false and the ingestion
 * pipeline simply skips this adapter — the rest of the platform runs fine
 * on demo data alone.
 *
 * HONESTY NOTE (re-verified in this pass): this sandbox has no outbound
 * network access to francetravail.fr/.io (every request is rejected by the
 * environment's egress proxy before it leaves the container), and no
 * credentials were available either, so this adapter still could not be
 * exercised against the live API end-to-end.
 *
 * What changed in this pass: the search host was corrected from
 * `api.francetravail.fr` to `api.francetravail.io` — cross-checked via
 * GitHub code search across 9 independent, unrelated real-world
 * repositories that all hardcode
 * `https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search`
 * for this exact endpoint, several dated well after the 2024 rebrand. The
 * OAuth token host (`entreprise.francetravail.fr`) was already correct and
 * is unchanged — token issuance and job search live on different hosts,
 * which is easy to trip over. Still not live-tested. Before relying on
 * this in production: sign in to https://francetravail.io/data/api/offres-emploi
 * yourself, confirm the exact search path against your subscribed API
 * version, then run `npm run refresh:jobs` and check the console for
 * mapping issues.
 */

const TOKEN_URL =
  "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire";
const SEARCH_URL = "https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search";

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.FRANCE_TRAVAIL_CLIENT_ID;
  const clientSecret = process.env.FRANCE_TRAVAIL_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "api_offresdemploiv2 o2dsoffre",
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    // Throw rather than return null: getAccessToken() is only ever called
    // when credentials are configured, so a failure here is a real
    // operational problem (bad credentials, API down) that must surface as
    // a failed sync (JobSource.lastSyncOk = false), not look like "0 jobs".
    throw new Error(`token request failed with status ${res.status}`);
  }
  const data = await res.json();
  return data.access_token ?? null;
}

function mapContractType(typeContrat: string | undefined): NormalizedJob["contractType"] {
  switch (typeContrat) {
    case "CDI": return "CDI";
    case "CDD": return "CDD";
    case "MIS": return "INTERIM";
    case "SAI": return "SAISONNIER";
    case "LIB": return "FREELANCE";
    default: return "CDD";
  }
}

function mapExperienceLevel(niveauExperience: string | undefined): NormalizedJob["experienceLevel"] {
  // France Travail's `experienceExige` field is typically "D" (débutant
  // accepté), "S" (souhaitée), or "E" (exigée) — we only have enough
  // signal to distinguish "no experience required" from "some expected".
  if (niveauExperience === "D") return "ENTRY";
  return "ANY";
}

export function mapOffer(offer: Record<string, unknown>): NormalizedJob | null {
  try {
    const id = String(offer.id ?? "");
    const title = String(offer.intitule ?? "");
    const description = String(offer.description ?? "");
    if (!id || !title) return null;

    const lieuTravail = offer.lieuTravail as Record<string, unknown> | undefined;
    const entreprise = offer.entreprise as Record<string, unknown> | undefined;
    const contact = offer.contact as Record<string, unknown> | undefined;
    const salaire = offer.salaire as Record<string, unknown> | undefined;
    const origineOffre = offer.origineOffre as Record<string, unknown> | undefined;
    const competences = offer.competences as Record<string, unknown>[] | undefined;

    // lieuTravail.libelle is typically "75 - Paris" or "75011 - Paris 11e" —
    // best-effort split, not a substitute for a real geocoder.
    const libelle = (lieuTravail?.libelle as string) ?? "";
    const cityGuess = libelle.includes(" - ") ? libelle.split(" - ").slice(1).join(" - ").trim() : libelle;

    return {
      externalId: id,
      title,
      companyName: (entreprise?.nom as string) || "Entreprise non précisée",
      description,
      city: cityGuess || undefined,
      postcode: (lieuTravail?.codePostal as string) || undefined,
      latitude: typeof lieuTravail?.latitude === "number" ? (lieuTravail.latitude as number) : undefined,
      longitude: typeof lieuTravail?.longitude === "number" ? (lieuTravail.longitude as number) : undefined,
      country: "FR",
      contractType: mapContractType(offer.typeContrat as string),
      experienceLevel: mapExperienceLevel(offer.experienceExige as string),
      // `salaire.libelle` is a free-text string (e.g. "Mensuel de 1800.00 Euros
      // à 2200.00 Euros") in this API rather than separate min/max numbers —
      // we don't attempt to parse it here to avoid silently-wrong numbers;
      // it is dropped, which is safer than a bad regex guess at a salary.
      salaryMin: undefined,
      salaryMax: undefined,
      hoursPerWeek: (offer.dureeTravailLibelleConverti as string)?.includes("Temps plein") ? 35 : undefined,
      schedule: (offer.dureeTravailLibelle as string) || (salaire?.libelle as string) || undefined,
      remoteType: "ONSITE_ONLY",
      requiredSkills: (competences ?? []).map((c) => String(c.libelle ?? "")).filter(Boolean),
      url: (origineOffre?.urlOrigine as string) || `https://candidat.francetravail.fr/offres/recherche/detail/${id}`,
      contactEmail: contact?.courriel as string | undefined,
      publishedAt: (offer.dateCreation as string) || new Date().toISOString(),
    };
  } catch (err) {
    console.error("[franceTravailSource] failed to map offer", err);
    return null;
  }
}

export const franceTravailSource: JobSourceAdapter = {
  key: "france_travail",
  name: "France Travail (API Offres d'emploi)",
  kind: "PUBLIC_API",
  isConfigured() {
    return Boolean(
      process.env.FRANCE_TRAVAIL_CLIENT_ID && process.env.FRANCE_TRAVAIL_CLIENT_SECRET
    );
  },
  async fetchJobs() {
    const token = await getAccessToken();
    if (!token) return [];

    const res = await fetch(`${SEARCH_URL}?range=0-49`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // The API returns 206 (Partial Content) on a normal paginated response.
    if (!res.ok && res.status !== 206) {
      throw new Error(`search request failed with status ${res.status}`);
    }
    const data = await res.json();
    const offers: Record<string, unknown>[] = data.resultats ?? [];
    return offers.map(mapOffer).filter((j): j is NormalizedJob => j !== null);
  },
};
