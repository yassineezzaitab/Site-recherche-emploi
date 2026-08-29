import type { JobSourceAdapter, NormalizedJob } from "./types";

/**
 * France Travail (ex Pôle Emploi) "Offres d'emploi" public API adapter.
 *
 * This is a real, free, official API — not a scrape — intended for exactly
 * this use case. Register a partner application at https://pole-emploi.io
 * to get a client id/secret, then set FRANCE_TRAVAIL_CLIENT_ID and
 * FRANCE_TRAVAIL_CLIENT_SECRET. Until those are set, isConfigured()
 * returns false and the ingestion pipeline simply skips this adapter —
 * the rest of the platform runs fine on demo data alone.
 *
 * HONESTY NOTE: this adapter has not been exercised against the live API
 * in this environment (no credentials were available to test with). The
 * OAuth2 client-credentials flow and the search endpoint URL below match
 * the publicly documented API shape at the time this was written, but the
 * exact response field names can change — if you wire in real credentials,
 * run `npm run refresh:jobs` and check the console for mapping warnings
 * before trusting the ingested data, and adjust `mapOffer` below against
 * the current docs if any field comes through empty unexpectedly.
 */

const TOKEN_URL =
  "https://entreprise.pole-emploi.fr/connexion/oauth2/access_token?realm=%2Fpartenaire";
const SEARCH_URL = "https://api.pole-emploi.io/partenaire/offresdemploi/v2/offres/search";

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.FRANCE_TRAVAIL_CLIENT_ID;
  const clientSecret = process.env.FRANCE_TRAVAIL_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: `api_offresdemploiv2 o2dsoffre`,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    console.error("[franceTravailSource] token request failed", res.status);
    return null;
  }
  const data = await res.json();
  return data.access_token ?? null;
}

function mapContractType(codeROME: string | undefined, typeContrat: string | undefined): NormalizedJob["contractType"] {
  switch (typeContrat) {
    case "CDI": return "CDI";
    case "CDD": return "CDD";
    case "MIS": return "INTERIM";
    case "SAI": return "SAISONNIER";
    default: return "CDD";
  }
}

function mapOffer(offer: Record<string, unknown>): NormalizedJob | null {
  try {
    const id = String(offer.id);
    const title = String(offer.intitule ?? "");
    const description = String(offer.description ?? "");
    if (!id || !title) return null;

    const lieuTravail = offer.lieuTravail as Record<string, unknown> | undefined;
    const entreprise = offer.entreprise as Record<string, unknown> | undefined;
    const contact = offer.contact as Record<string, unknown> | undefined;

    return {
      externalId: id,
      title,
      companyName: (entreprise?.nom as string) || "Entreprise non précisée",
      description,
      city: (lieuTravail?.libelle as string)?.split(" - ")?.[1]?.trim(),
      postcode: (lieuTravail?.codePostal as string) || undefined,
      latitude: (lieuTravail?.latitude as number) || undefined,
      longitude: (lieuTravail?.longitude as number) || undefined,
      country: "FR",
      contractType: mapContractType(undefined, offer.typeContrat as string),
      experienceLevel: "ANY",
      salaryMin: undefined,
      salaryMax: undefined,
      hoursPerWeek: (offer.dureeTravailLibelleConverti as string)?.includes("Temps plein") ? 35 : undefined,
      remoteType: "ONSITE_ONLY",
      requiredSkills: [],
      url: (offer.origineOffre as Record<string, unknown>)?.urlOrigine as string || `https://candidat.pole-emploi.fr/offres/recherche/detail/${id}`,
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
    if (!res.ok && res.status !== 206) {
      console.error("[franceTravailSource] search request failed", res.status);
      return [];
    }
    const data = await res.json();
    const offers: Record<string, unknown>[] = data.resultats ?? [];
    return offers.map(mapOffer).filter((j): j is NormalizedJob => j !== null);
  },
};
