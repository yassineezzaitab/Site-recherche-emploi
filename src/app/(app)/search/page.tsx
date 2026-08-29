"use client";

import { useCallback, useEffect, useState } from "react";
import { Search as SearchIcon, SlidersHorizontal, Sparkles, List, Map as MapIcon } from "lucide-react";
import { JobCard } from "@/components/job/JobCard";
import { JobsMap } from "@/components/search/JobsMap";
import { CONTRACT_TYPES, REMOTE_PREFERENCES } from "@/lib/validation/profile";
import { contractLabel, remoteLabel } from "@/lib/format";
import type { JobListItem } from "@/types/job";

interface ParsedQueryInfo {
  matchedRules: string[];
  hoursPerWeekMin: number | null;
  hoursPerWeekMax: number | null;
  maxCommuteMinutes: number | null;
  minSalaryMonthly: number | null;
  contractTypes: string[];
  experienceLevel: string | null;
  sectors: string[];
}

const RULE_LABELS: Record<string, string> = {
  hours_range: "volume horaire",
  hours_max: "volume horaire max",
  hours_single: "volume horaire",
  days: "jours souhaités",
  weekend_days: "week-end",
  slots: "créneaux horaires",
  distance_km: "distance max",
  commute_minutes: "temps de trajet max",
  salary: "salaire minimum",
  contract_types: "type de contrat",
  experience_student: "profil étudiant",
  experience_entry: "sans expérience",
  remote_full: "télétravail complet",
  remote_hybrid: "télétravail hybride",
  sectors: "secteur",
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [contractTypes, setContractTypes] = useState<string[]>([]);
  const [remote, setRemote] = useState<string[]>([]);
  const [minSalary, setMinSalary] = useState("");
  const [maxDistanceKm, setMaxDistanceKm] = useState("");
  const [sort, setSort] = useState("match");
  const [showFilters, setShowFilters] = useState(false);

  const [items, setItems] = useState<JobListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [parsedQuery, setParsedQuery] = useState<ParsedQueryInfo | null>(null);
  const [hasProfile, setHasProfile] = useState(true);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "map">("list");
  const [origin, setOrigin] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.profile?.latitude != null && data.profile?.longitude != null) {
          setOrigin({ latitude: data.profile.latitude, longitude: data.profile.longitude });
        }
      })
      .catch(() => {});
  }, []);

  const runSearch = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (contractTypes.length) params.set("contractTypes", contractTypes.join(","));
    if (remote.length) params.set("remote", remote.join(","));
    if (minSalary) params.set("minSalary", minSalary);
    if (maxDistanceKm) params.set("maxDistanceKm", maxDistanceKm);
    params.set("sort", sort);
    params.set("pageSize", "30");

    const res = await fetch(`/api/jobs?${params.toString()}`);
    const data = await res.json();
    setItems(data.items ?? []);
    setTotal(data.total ?? 0);
    setParsedQuery(data.parsedQuery);
    setHasProfile(data.hasProfile);
    setLoading(false);
  }, [query, contractTypes, remote, minSalary, maxDistanceKm, sort]);

  useEffect(() => {
    runSearch();
  }, [runSearch]);

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  const understoodRules = (parsedQuery?.matchedRules ?? []).map((r) => RULE_LABELS[r] ?? r);

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-16">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-950">Recherche</h1>
        <p className="text-sm text-ink-500">
          Décrivez ce que vous cherchez avec vos mots, ou utilisez les filtres.
        </p>
      </div>

      {!hasProfile && (
        <div className="rounded-lg bg-brand-100 px-4 py-3 text-sm text-brand-700">
          Complétez votre <a href="/profile" className="font-medium underline">profil</a> pour voir vos
          scores de compatibilité personnalisés.
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          runSearch();
        }}
        className="card flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            className="input pl-9"
            placeholder="Ex : job étudiant, 15h/semaine, le soir, à moins de 20 minutes"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary">Rechercher</button>
        <button type="button" onClick={() => setShowFilters(!showFilters)} className="btn-secondary">
          <SlidersHorizontal size={16} /> Filtres
        </button>
      </form>

      {understoodRules.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-accent-100 px-4 py-2.5 text-sm text-accent-600">
          <Sparkles size={15} />
          Nous avons compris : {understoodRules.join(", ")}.
        </div>
      )}

      {showFilters && (
        <div className="card grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Type de contrat</label>
            <div className="flex flex-wrap gap-2">
              {CONTRACT_TYPES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggle(contractTypes, setContractTypes, c)}
                  className={`badge border ${contractTypes.includes(c) ? "border-brand-600 bg-brand-600 text-white" : "border-ink-200 bg-white text-ink-600"}`}
                >
                  {contractLabel(c)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Télétravail</label>
            <div className="flex flex-wrap gap-2">
              {REMOTE_PREFERENCES.filter((r) => r !== "NO_PREFERENCE").map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggle(remote, setRemote, r)}
                  className={`badge border ${remote.includes(r) ? "border-brand-600 bg-brand-600 text-white" : "border-ink-200 bg-white text-ink-600"}`}
                >
                  {remoteLabel(r)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Salaire minimum (€/mois)</label>
            <input type="number" className="input" value={minSalary} onChange={(e) => setMinSalary(e.target.value)} />
          </div>
          <div>
            <label className="label">Distance max (km)</label>
            <input type="number" className="input" value={maxDistanceKm} onChange={(e) => setMaxDistanceKm(e.target.value)} />
          </div>
          <div>
            <label className="label">Trier par</label>
            <select className="input" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="match">Meilleure compatibilité</option>
              <option value="date">Plus récentes</option>
              <option value="salary">Salaire</option>
            </select>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500">{loading ? "Recherche en cours..." : `${total} offre(s) trouvée(s)`}</p>
        <div className="flex overflow-hidden rounded-lg ring-1 ring-ink-200">
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${view === "list" ? "bg-brand-600 text-white" : "bg-white text-ink-600"}`}
          >
            <List size={14} /> Liste
          </button>
          <button
            onClick={() => setView("map")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${view === "map" ? "bg-brand-600 text-white" : "bg-white text-ink-600"}`}
          >
            <MapIcon size={14} /> Carte
          </button>
        </div>
      </div>

      {view === "list" ? (
        <div className="space-y-3">
          {items.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
          {!loading && items.length === 0 && (
            <div className="card text-center text-sm text-ink-500">
              Aucune offre ne correspond à ces critères pour le moment. Essayez d&apos;élargir votre recherche.
            </div>
          )}
        </div>
      ) : (
        <div className="h-[500px] sm:h-[600px]">
          <JobsMap jobs={items} origin={origin} />
        </div>
      )}
    </div>
  );
}
