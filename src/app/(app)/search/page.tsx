"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search as SearchIcon, SlidersHorizontal, Sparkles, List, Map as MapIcon, MapPin, Briefcase, GraduationCap } from "lucide-react";
import { JobCard } from "@/components/job/JobCard";
import { JobsMap } from "@/components/search/JobsMap";
import { CONTRACT_TYPES, REMOTE_PREFERENCES } from "@/lib/validation/profile";
import { contractLabel, remoteLabel } from "@/lib/format";
import type { JobListItem } from "@/types/job";
import type { Suggestion } from "@/lib/search/suggest";

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

interface ProfileSummary {
  city?: string | null;
  experienceLevel?: string | null;
  hoursPerWeekMin?: number | null;
  hoursPerWeekMax?: number | null;
  sectors?: string[];
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

const GUIDED_EXAMPLES = [
  "Job étudiant à Lyon",
  "Alternance marketing",
  "Temps partiel 15h",
  "Sans expérience",
  "Développeur junior télétravail",
];

function lastToken(text: string): string {
  const parts = text.split(/\s+/);
  return parts[parts.length - 1] ?? "";
}

function replaceLastToken(text: string, replacement: string): string {
  const parts = text.split(/\s+/);
  parts[parts.length - 1] = replacement;
  return parts.join(" ") + " ";
}

// The search page's own suggest call only ever returns city/profession/
// formation (see /api/search/suggest), but Suggestion["type"] is a shared
// union with the profile page's skill/sector suggestions — cover every
// member here too so this stays a valid, exhaustive lookup.
const SUGGESTION_ICON: Record<Suggestion["type"], typeof MapPin> = {
  city: MapPin,
  profession: Briefcase,
  formation: GraduationCap,
  skill: Briefcase,
  sector: Briefcase,
};
const SUGGESTION_LABEL: Record<Suggestion["type"], string> = {
  city: "Ville",
  profession: "Métier",
  formation: "Formation",
  skill: "Compétence",
  sector: "Secteur",
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
  const [profile, setProfile] = useState<ProfileSummary | null>(null);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.profile?.latitude != null && data.profile?.longitude != null) {
          setOrigin({ latitude: data.profile.latitude, longitude: data.profile.longitude });
        }
        if (data.profile) {
          setProfile({
            city: data.profile.city,
            experienceLevel: data.profile.experienceLevel,
            hoursPerWeekMin: data.profile.hoursPerWeekMin,
            hoursPerWeekMax: data.profile.hoursPerWeekMax,
            sectors: data.profile.sectors,
          });
        }
      })
      .catch(() => {});
  }, []);

  // Debounce the free-text query before it drives a search: without this,
  // every keystroke fired its own /api/jobs request (typing "développeur"
  // meant 11 requests in a row). Filter toggles (contract type, remote,
  // sort...) are discrete clicks, not keystrokes, so they still search
  // immediately — only `query` goes through the debounce.
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(handle);
  }, [query]);

  const runSearch = useCallback(async (overrideQuery?: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    const q = overrideQuery ?? debouncedQuery;
    if (q) params.set("q", q);
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
  }, [debouncedQuery, contractTypes, remote, minSalary, maxDistanceKm, sort]);

  useEffect(() => {
    runSearch();
  }, [runSearch]);

  // Debounced autocomplete on the last word being typed.
  useEffect(() => {
    const token = lastToken(query);
    if (token.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const handle = setTimeout(async () => {
      suggestAbortRef.current?.abort();
      const controller = new AbortController();
      suggestAbortRef.current = controller;
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(token)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        const combined: Suggestion[] = [
          ...(data.cities ?? []),
          ...(data.professions ?? []),
          ...(data.formations ?? []),
        ];
        setSuggestions(combined);
        setShowSuggestions(combined.length > 0);
        setActiveIndex(-1);
      } catch {
        // Aborted or network error — leave whatever suggestions were showing.
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function applySuggestion(s: Suggestion) {
    const next = replaceLastToken(query, s.value);
    setQuery(next);
    setShowSuggestions(false);
    setSuggestions([]);
    inputRef.current?.focus();
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      applySuggestion(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  const understoodRules = (parsedQuery?.matchedRules ?? []).map((r) => RULE_LABELS[r] ?? r);

  const profileChips = useMemo(() => {
    if (!profile) return [];
    const chips: string[] = [];
    if (profile.experienceLevel === "STUDENT" && profile.hoursPerWeekMax) {
      chips.push(`Missions compatibles avec ${profile.hoursPerWeekMax}h/semaine`);
    }
    if (profile.city) {
      chips.push(`Offres à ${profile.city}`);
    }
    if (profile.sectors?.[0]) {
      chips.push(`${profile.sectors[0]} à temps partiel`);
    }
    return chips.slice(0, 3);
  }, [profile]);

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
          setShowSuggestions(false);
          // Pass the live query explicitly: debouncedQuery can lag up to
          // 350ms behind what's on screen, and a manual submit should
          // never wait on that.
          runSearch(query);
        }}
        className="card flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            ref={inputRef}
            className="input pl-9"
            placeholder="Ex : job étudiant, 15h/semaine, le soir, à moins de 20 minutes"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            autoComplete="off"
            role="combobox"
            aria-expanded={showSuggestions}
            aria-controls="search-suggestions-list"
            aria-autocomplete="list"
          />
          {showSuggestions && (
            <ul
              id="search-suggestions-list"
              role="listbox"
              className="absolute left-0 right-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-lg border border-ink-200 bg-white shadow-lg"
            >
              {suggestions.map((s, i) => {
                const Icon = SUGGESTION_ICON[s.type];
                return (
                  <li key={`${s.type}-${s.label}-${i}`}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applySuggestion(s)}
                      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm ${
                        i === activeIndex ? "bg-brand-50" : "hover:bg-ink-50"
                      }`}
                    >
                      <Icon size={15} className="shrink-0 text-ink-400" />
                      <span className="flex-1 truncate text-ink-800">{s.label}</span>
                      <span className="shrink-0 text-xs text-ink-400">
                        {s.meta ?? SUGGESTION_LABEL[s.type]}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <button type="submit" className="btn-primary">Rechercher</button>
        <button type="button" onClick={() => setShowFilters(!showFilters)} className="btn-secondary">
          <SlidersHorizontal size={16} /> Filtres
        </button>
      </form>

      {(GUIDED_EXAMPLES.length > 0 || profileChips.length > 0) && !query && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ink-500">Que recherchez-vous ?</span>
          {profileChips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => {
                setQuery(chip);
                runSearch(chip);
              }}
              className="badge border border-brand-300 bg-brand-50 text-brand-700"
            >
              {chip}
            </button>
          ))}
          {GUIDED_EXAMPLES.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => {
                setQuery(chip);
                runSearch(chip);
              }}
              className="badge border border-ink-200 bg-white text-ink-600"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

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
