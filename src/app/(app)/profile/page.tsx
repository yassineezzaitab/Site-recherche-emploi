"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import { CvUpload } from "@/components/profile/CvUpload";
import { ExtractionReview, type ReviewedData } from "@/components/profile/ExtractionReview";
import type { ResumeExtraction } from "@/lib/resume/parseResume";
import {
  CONTRACT_TYPES,
  EXPERIENCE_LEVELS,
  REMOTE_PREFERENCES,
  DAYS,
  SLOTS,
} from "@/lib/validation/profile";
import { contractLabel, experienceLabel, remoteLabel, dayLabel, slotLabel } from "@/lib/format";
import { suggestProfessions, suggestSkills, suggestSectors } from "@/lib/search/suggest";

interface SkillItem { name: string; }
interface ExperienceItem {
  company: string; title: string; location?: string | null;
  startDate: string | null; endDate: string | null; isCurrent: boolean; description: string | null;
}
interface EducationItem {
  institution: string; degree: string | null; fieldOfStudy?: string | null;
  startDate: string | null; endDate: string | null; isCurrent: boolean;
}
interface LanguageItem { name: string; level: string | null; }
interface CertificationItem { name: string; issuer: string | null; }

interface ProfileState {
  firstName: string; lastName: string; phone: string; city: string; postcode: string;
  headline: string; summary: string;
  desiredTitles: string[]; sectors: string[]; contractTypes: string[];
  minSalaryMonthly: number | null; maxDistanceKm: number | null;
  remotePreference: string; experienceLevel: string;
  availableDays: string[]; availableSlots: string[];
  hoursPerWeekMin: number | null; hoursPerWeekMax: number | null;
  hasCar: boolean; hasScooter: boolean; hasBike: boolean; usesPublicTransit: boolean;
  mobilityNotes: string; constraints: string;
}

const EMPTY_PROFILE: ProfileState = {
  firstName: "", lastName: "", phone: "", city: "", postcode: "",
  headline: "", summary: "",
  desiredTitles: [], sectors: [], contractTypes: [],
  minSalaryMonthly: null, maxDistanceKm: 25,
  remotePreference: "NO_PREFERENCE", experienceLevel: "ANY",
  availableDays: [], availableSlots: [],
  hoursPerWeekMin: null, hoursPerWeekMax: null,
  hasCar: false, hasScooter: false, hasBike: false, usesPublicTransit: true,
  mobilityNotes: "", constraints: "",
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileState>(EMPTY_PROFILE);
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [experiences, setExperiences] = useState<ExperienceItem[]>([]);
  const [educations, setEducations] = useState<EducationItem[]>([]);
  const [languages, setLanguages] = useState<LanguageItem[]>([]);
  const [certifications, setCertifications] = useState<CertificationItem[]>([]);
  const [skillDraft, setSkillDraft] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const [sectorDraft, setSectorDraft] = useState("");
  const [extraction, setExtraction] = useState<ResumeExtraction | null>(null);
  const [applying, setApplying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCoordinates, setHasCoordinates] = useState(true);

  const loadProfile = useCallback(async () => {
    const res = await fetch("/api/profile");
    const data = await res.json();
    if (data.profile) {
      const p = data.profile;
      setProfile({
        firstName: p.firstName ?? "", lastName: p.lastName ?? "", phone: p.phone ?? "",
        city: p.city ?? "", postcode: p.postcode ?? "", headline: p.headline ?? "", summary: p.summary ?? "",
        desiredTitles: p.desiredTitles ?? [], sectors: p.sectors ?? [], contractTypes: p.contractTypes ?? [],
        minSalaryMonthly: p.minSalaryMonthly, maxDistanceKm: p.maxDistanceKm ?? 25,
        remotePreference: p.remotePreference, experienceLevel: p.experienceLevel,
        availableDays: p.availableDays ?? [], availableSlots: p.availableSlots ?? [],
        hoursPerWeekMin: p.hoursPerWeekMin, hoursPerWeekMax: p.hoursPerWeekMax,
        hasCar: p.hasCar, hasScooter: p.hasScooter, hasBike: p.hasBike, usesPublicTransit: p.usesPublicTransit,
        mobilityNotes: p.mobilityNotes ?? "", constraints: p.constraints ?? "",
      });
      setHasCoordinates(!p.city || (p.latitude != null && p.longitude != null));
      setSkills(p.skills.map((s: { skill: { name: string } }) => ({ name: s.skill.name })));
      setExperiences(p.experiences);
      setEducations(p.educations);
      setLanguages(p.languages);
      setCertifications(p.certifications);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function saveAll(overrides?: Partial<{ skills: SkillItem[]; experiences: ExperienceItem[]; educations: EducationItem[]; languages: LanguageItem[]; certifications: CertificationItem[]; profile: Partial<ProfileState> }>) {
    setSaving(true);
    const mergedProfile = { ...profile, ...(overrides?.profile ?? {}) };
    const body = {
      profile: mergedProfile,
      skills: (overrides?.skills ?? skills).map((s) => ({ name: s.name })),
      experiences: (overrides?.experiences ?? experiences).map((e) => ({
        company: e.company, title: e.title, startDate: e.startDate, endDate: e.endDate,
        isCurrent: e.isCurrent, description: e.description,
      })),
      educations: (overrides?.educations ?? educations).map((e) => ({
        institution: e.institution, degree: e.degree, startDate: e.startDate, endDate: e.endDate, isCurrent: e.isCurrent,
      })),
      languages: (overrides?.languages ?? languages).map((l) => ({ name: l.name, level: l.level })),
      certifications: (overrides?.certifications ?? certifications).map((c) => ({ name: c.name, issuer: c.issuer })),
    };
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      setSavedAt(Date.now());
      await loadProfile();
    }
  }

  async function applyExtraction(data: ReviewedData) {
    setApplying(true);
    const mergedSkills = Array.from(
      new Set([...skills.map((s) => s.name), ...data.skills])
    ).map((name) => ({ name }));
    const mergedExperiences = [
      ...experiences,
      ...data.experiences.map((e) => ({ ...e, description: e.description || null })),
    ];
    const mergedEducations = [...educations, ...data.educations.map((e) => ({ ...e, isCurrent: false }))];
    const mergedLanguages = [
      ...languages.filter((l) => !data.languages.some((d) => d.name === l.name)),
      ...data.languages,
    ];
    const mergedCertifications = [...certifications, ...data.certifications];

    setSkills(mergedSkills);
    setExperiences(mergedExperiences);
    setEducations(mergedEducations);
    setLanguages(mergedLanguages);
    setCertifications(mergedCertifications);

    await saveAll({
      skills: mergedSkills,
      experiences: mergedExperiences,
      educations: mergedEducations,
      languages: mergedLanguages,
      certifications: mergedCertifications,
      profile: {
        city: profile.city || data.city || "",
        phone: profile.phone || data.phone || "",
      },
    });
    setApplying(false);
    setExtraction(null);
  }

  function toggleArrayValue(key: "contractTypes" | "availableDays" | "availableSlots", value: string) {
    setProfile((p) => ({
      ...p,
      [key]: p[key].includes(value) ? p[key].filter((v) => v !== value) : [...p[key], value],
    }));
  }

  if (loading) return <div className="text-sm text-ink-400">Chargement du profil...</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-950">Mon profil</h1>
        <p className="text-sm text-ink-500">
          Plus votre profil est complet, plus vos correspondances seront précises.
        </p>
      </div>

      <CvUpload onExtracted={setExtraction} />
      {extraction && (
        <ExtractionReview extraction={extraction} onApply={applyExtraction} applying={applying} />
      )}

      {/* Identity */}
      <div className="card space-y-4">
        <h2 className="font-display text-lg font-semibold text-ink-900">Identité</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Prénom">
            <input className="input" value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} />
          </Field>
          <Field label="Nom">
            <input className="input" value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} />
          </Field>
          <Field label="Téléphone">
            <input className="input" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          </Field>
          <Field label="Ville">
            <input className="input" value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} />
            {!hasCoordinates && (
              <p className="mt-1 text-xs text-warn-600">
                Impossible de localiser cette ville pour l&apos;instant : le calcul de distance
                sera approximatif. Vérifiez l&apos;orthographe ou réessayez après avoir enregistré.
              </p>
            )}
          </Field>
        </div>
        <Field label="Titre professionnel">
          <input
            className="input"
            placeholder="Ex : Étudiant ingénieur — recherche alternance"
            value={profile.headline}
            onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
          />
        </Field>
        <Field label="Résumé">
          <textarea className="input" rows={3} value={profile.summary} onChange={(e) => setProfile({ ...profile, summary: e.target.value })} />
        </Field>
      </div>

      {/* Search criteria */}
      <div className="card space-y-4">
        <h2 className="font-display text-lg font-semibold text-ink-900">Recherche</h2>
        <Field label="Métiers recherchés">
          <TagInput
            items={profile.desiredTitles}
            draft={titleDraft}
            setDraft={setTitleDraft}
            onAdd={(v) => setProfile({ ...profile, desiredTitles: [...profile.desiredTitles, v] })}
            onRemove={(i) => setProfile({ ...profile, desiredTitles: profile.desiredTitles.filter((_, idx) => idx !== i) })}
            placeholder="Ex : Vendeur, Développeur web..."
            suggest={suggestProfessions}
          />
        </Field>
        <Field label="Secteurs">
          <TagInput
            items={profile.sectors}
            draft={sectorDraft}
            setDraft={setSectorDraft}
            onAdd={(v) => setProfile({ ...profile, sectors: [...profile.sectors, v] })}
            onRemove={(i) => setProfile({ ...profile, sectors: profile.sectors.filter((_, idx) => idx !== i) })}
            placeholder="Ex : Marketing, Commerce..."
            suggest={suggestSectors}
          />
        </Field>
        <Field label="Types de contrat">
          <div className="flex flex-wrap gap-2">
            {CONTRACT_TYPES.map((c) => (
              <Chip key={c} active={profile.contractTypes.includes(c)} onClick={() => toggleArrayValue("contractTypes", c)}>
                {contractLabel(c)}
              </Chip>
            ))}
          </div>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Salaire minimum souhaité (€/mois)">
            <input
              type="number"
              className="input"
              value={profile.minSalaryMonthly ?? ""}
              onChange={(e) => setProfile({ ...profile, minSalaryMonthly: e.target.value ? Number(e.target.value) : null })}
            />
          </Field>
          <Field label="Rayon de recherche max (km)">
            <input
              type="number"
              className="input"
              value={profile.maxDistanceKm ?? ""}
              onChange={(e) => setProfile({ ...profile, maxDistanceKm: e.target.value ? Number(e.target.value) : null })}
            />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Télétravail">
            <select className="input" value={profile.remotePreference} onChange={(e) => setProfile({ ...profile, remotePreference: e.target.value })}>
              {REMOTE_PREFERENCES.map((r) => <option key={r} value={r}>{remoteLabel(r)}</option>)}
            </select>
          </Field>
          <Field label="Niveau d'expérience">
            <select className="input" value={profile.experienceLevel} onChange={(e) => setProfile({ ...profile, experienceLevel: e.target.value })}>
              {EXPERIENCE_LEVELS.map((l) => <option key={l} value={l}>{experienceLabel(l)}</option>)}
            </select>
          </Field>
        </div>
      </div>

      {/* Availability */}
      <div className="card space-y-4">
        <h2 className="font-display text-lg font-semibold text-ink-900">Disponibilité</h2>
        <Field label="Jours disponibles">
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d) => (
              <Chip key={d} active={profile.availableDays.includes(d)} onClick={() => toggleArrayValue("availableDays", d)}>
                {dayLabel(d)}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Créneaux">
          <div className="flex flex-wrap gap-2">
            {SLOTS.map((s) => (
              <Chip key={s} active={profile.availableSlots.includes(s)} onClick={() => toggleArrayValue("availableSlots", s)}>
                {slotLabel(s)}
              </Chip>
            ))}
          </div>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Heures / semaine (min)">
            <input type="number" className="input" value={profile.hoursPerWeekMin ?? ""} onChange={(e) => setProfile({ ...profile, hoursPerWeekMin: e.target.value ? Number(e.target.value) : null })} />
          </Field>
          <Field label="Heures / semaine (max)">
            <input type="number" className="input" value={profile.hoursPerWeekMax ?? ""} onChange={(e) => setProfile({ ...profile, hoursPerWeekMax: e.target.value ? Number(e.target.value) : null })} />
          </Field>
        </div>
      </div>

      {/* Mobility */}
      <div className="card space-y-4">
        <h2 className="font-display text-lg font-semibold text-ink-900">Mobilité</h2>
        <div className="flex flex-wrap gap-4">
          {([["hasCar", "Voiture"], ["hasScooter", "Scooter"], ["hasBike", "Vélo"], ["usesPublicTransit", "Transports en commun"]] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm text-ink-700">
              <input type="checkbox" checked={profile[key]} onChange={(e) => setProfile({ ...profile, [key]: e.target.checked })} />
              {label}
            </label>
          ))}
        </div>
        <Field label="Contraintes particulières">
          <textarea className="input" rows={2} value={profile.constraints} onChange={(e) => setProfile({ ...profile, constraints: e.target.value })} placeholder="Ex : disponible uniquement le soir et le week-end" />
        </Field>
      </div>

      {/* Skills */}
      <div className="card space-y-3">
        <h2 className="font-display text-lg font-semibold text-ink-900">Compétences</h2>
        <TagInput
          items={skills.map((s) => s.name)}
          draft={skillDraft}
          setDraft={setSkillDraft}
          onAdd={(v) => setSkills([...skills, { name: v }])}
          onRemove={(i) => setSkills(skills.filter((_, idx) => idx !== i))}
          placeholder="Ajouter une compétence"
          suggest={suggestSkills}
        />
      </div>

      {/* Experiences */}
      <ListEditor
        title="Expériences"
        items={experiences}
        onAdd={() => setExperiences([...experiences, { company: "", title: "", startDate: null, endDate: null, isCurrent: false, description: "" }])}
        onRemove={(i) => setExperiences(experiences.filter((_, idx) => idx !== i))}
        render={(exp, i) => (
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="input" placeholder="Poste" value={exp.title} onChange={(e) => setExperiences(experiences.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))} />
            <input className="input" placeholder="Entreprise" value={exp.company} onChange={(e) => setExperiences(experiences.map((x, idx) => idx === i ? { ...x, company: e.target.value } : x))} />
            <input type="date" className="input" value={exp.startDate?.slice(0, 10) ?? ""} onChange={(e) => setExperiences(experiences.map((x, idx) => idx === i ? { ...x, startDate: e.target.value || null } : x))} />
            <input type="date" className="input" disabled={exp.isCurrent} value={exp.endDate?.slice(0, 10) ?? ""} onChange={(e) => setExperiences(experiences.map((x, idx) => idx === i ? { ...x, endDate: e.target.value || null } : x))} />
            <label className="flex items-center gap-2 text-sm text-ink-600 sm:col-span-2">
              <input type="checkbox" checked={exp.isCurrent} onChange={(e) => setExperiences(experiences.map((x, idx) => idx === i ? { ...x, isCurrent: e.target.checked } : x))} />
              Poste actuel
            </label>
            <textarea className="input sm:col-span-2" rows={2} placeholder="Description" value={exp.description ?? ""} onChange={(e) => setExperiences(experiences.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x))} />
          </div>
        )}
      />

      {/* Educations */}
      <ListEditor
        title="Formations"
        items={educations}
        onAdd={() => setEducations([...educations, { institution: "", degree: "", startDate: null, endDate: null, isCurrent: false }])}
        onRemove={(i) => setEducations(educations.filter((_, idx) => idx !== i))}
        render={(edu, i) => (
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="input" placeholder="Diplôme" value={edu.degree ?? ""} onChange={(e) => setEducations(educations.map((x, idx) => idx === i ? { ...x, degree: e.target.value } : x))} />
            <input className="input" placeholder="Établissement" value={edu.institution} onChange={(e) => setEducations(educations.map((x, idx) => idx === i ? { ...x, institution: e.target.value } : x))} />
            <input type="date" className="input" value={edu.startDate?.slice(0, 10) ?? ""} onChange={(e) => setEducations(educations.map((x, idx) => idx === i ? { ...x, startDate: e.target.value || null } : x))} />
            <input type="date" className="input" disabled={edu.isCurrent} value={edu.endDate?.slice(0, 10) ?? ""} onChange={(e) => setEducations(educations.map((x, idx) => idx === i ? { ...x, endDate: e.target.value || null } : x))} />
            <label className="flex items-center gap-2 text-sm text-ink-600 sm:col-span-2">
              <input type="checkbox" checked={edu.isCurrent} onChange={(e) => setEducations(educations.map((x, idx) => idx === i ? { ...x, isCurrent: e.target.checked } : x))} />
              En cours
            </label>
          </div>
        )}
      />

      {/* Languages */}
      <ListEditor
        title="Langues"
        items={languages}
        onAdd={() => setLanguages([...languages, { name: "", level: "" }])}
        onRemove={(i) => setLanguages(languages.filter((_, idx) => idx !== i))}
        render={(lang, i) => (
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="input" placeholder="Langue" value={lang.name} onChange={(e) => setLanguages(languages.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))} />
            <input className="input" placeholder="Niveau (ex: B2, courant...)" value={lang.level ?? ""} onChange={(e) => setLanguages(languages.map((x, idx) => idx === i ? { ...x, level: e.target.value } : x))} />
          </div>
        )}
      />

      {/* Certifications */}
      <ListEditor
        title="Certifications"
        items={certifications}
        onAdd={() => setCertifications([...certifications, { name: "", issuer: "" }])}
        onRemove={(i) => setCertifications(certifications.filter((_, idx) => idx !== i))}
        render={(cert, i) => (
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="input" placeholder="Certification" value={cert.name} onChange={(e) => setCertifications(certifications.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))} />
            <input className="input" placeholder="Organisme" value={cert.issuer ?? ""} onChange={(e) => setCertifications(certifications.map((x, idx) => idx === i ? { ...x, issuer: e.target.value } : x))} />
          </div>
        )}
      />

      <div className="sticky bottom-4 flex items-center gap-3 rounded-xl2 bg-white p-4 shadow-elevated ring-1 ring-ink-100">
        <button onClick={() => saveAll()} disabled={saving} className="btn-primary">
          {saving ? "Enregistrement..." : "Enregistrer les modifications"}
        </button>
        {savedAt && Date.now() - savedAt < 4000 && (
          <span className="inline-flex items-center gap-1 text-sm text-accent-600">
            <CheckCircle2 size={16} /> Profil enregistré
          </span>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`badge border ${active ? "border-brand-600 bg-brand-600 text-white" : "border-ink-200 bg-white text-ink-600"}`}
    >
      {children}
    </button>
  );
}

function TagInput({
  items, draft, setDraft, onAdd, onRemove, placeholder, suggest,
}: {
  items: string[]; draft: string; setDraft: (v: string) => void;
  onAdd: (v: string) => void; onRemove: (i: number) => void; placeholder?: string;
  /** Optional: e.g. suggestProfessions — returns live suggestions for the current draft text. */
  suggest?: (query: string) => { label: string; meta?: string }[];
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestions = suggest && draft.trim().length >= 2 ? suggest(draft) : [];

  function commit(value: string) {
    onAdd(value);
    setDraft("");
    setShowSuggestions(false);
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span key={`${item}-${i}`} className="badge bg-ink-100 text-ink-700">
            {item}
            <button onClick={() => onRemove(i)} className="ml-1 text-ink-400 hover:text-danger-500">×</button>
          </span>
        ))}
      </div>
      <input
        className="input mt-2"
        placeholder={placeholder}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && draft.trim()) {
            e.preventDefault();
            commit(draft.trim());
          }
        }}
        autoComplete="off"
      />
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-ink-200 bg-white shadow-lg">
          {suggestions.map((s) => (
            <li key={s.label}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(s.label)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-ink-50"
              >
                <span className="text-ink-800">{s.label}</span>
                {s.meta && <span className="shrink-0 text-xs text-ink-400">{s.meta}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ListEditor<T>({
  title, items, onAdd, onRemove, render,
}: {
  title: string; items: T[]; onAdd: () => void; onRemove: (i: number) => void; render: (item: T, i: number) => React.ReactNode;
}) {
  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink-900">{title}</h2>
        <button onClick={onAdd} className="btn-ghost text-sm">
          <Plus size={16} /> Ajouter
        </button>
      </div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2 rounded-lg border border-ink-100 p-3">
            <div className="flex-1">{render(item, i)}</div>
            <button onClick={() => onRemove(i)} className="text-ink-400 hover:text-danger-500" aria-label="Supprimer">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-ink-400">Aucun élément pour le moment.</p>}
      </div>
    </div>
  );
}
