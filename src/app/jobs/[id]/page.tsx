"use client";

import { use, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  MapPin, Briefcase, Clock, Wifi, Euro, ExternalLink, Heart,
  Phone, Mail, Sparkles, CheckCircle2, AlertTriangle, ClipboardList,
} from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { MatchScoreRing } from "@/components/ui/MatchScore";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { AstaMotif } from "@/components/ui/motifs";
import { contractLabel, experienceLabel, remoteLabel, formatSalary, formatFreshness, formatDate } from "@/lib/format";
import type { MatchResult } from "@/types/job";

interface JobDetail {
  id: string; title: string; companyNameRaw: string; description: string; missions: string | null;
  city: string | null; region: string | null; contractType: string; experienceLevel: string;
  requiredDegree: string | null; salaryMin: number | null; salaryMax: number | null; salaryPeriod: string | null;
  hoursPerWeek: number | null; schedule: string | null; remoteType: string; requiredSkills: string[];
  languages: string[]; url: string; contactEmail: string | null; contactPhone: string | null;
  publishedAt: string; lastVerifiedAt: string; isDemo: boolean; sourceName: string;
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [applyStatus, setApplyStatus] = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/jobs/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.job) {
          setJob(data.job);
          setMatch(data.match);
        }
        setLoading(false);
      });
  }, [id]);

  async function toggleFavorite() {
    if (!session) return;
    await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: id }),
    });
    setSaved(true);
  }

  async function markApplication(status: string) {
    if (!session) return;
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: id, status }),
    });
    if (res.ok) setApplyStatus(status);
  }

  async function generateCoverLetter() {
    setGenerating(true);
    setError(null);
    const res = await fetch(`/api/jobs/${id}/cover-letter`, { method: "POST" });
    const data = await res.json();
    setGenerating(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setCoverLetter(data.letter);
  }

  if (loading) {
    return (
      <div>
        <PublicHeader />
        <div className="mx-auto max-w-4xl px-6 py-16 text-center text-sm text-ink-400">Chargement...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div>
        <PublicHeader />
        <div className="mx-auto max-w-4xl px-6 py-16 text-center text-sm text-ink-400">Offre introuvable.</div>
      </div>
    );
  }

  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryPeriod);

  return (
    <div className="min-h-screen bg-ink-50">
      <PublicHeader />
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="card flex flex-col gap-4 sm:flex-row sm:items-start">
          {match && (
            <div className="relative shrink-0">
              <MatchScoreRing score={match.score} size={72} />
              {match.score >= 90 && (
                <AstaMotif
                  size={22}
                  className="absolute -right-1 -top-1 motion-safe:animate-fade-in"
                />
              )}
            </div>
          )}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-ink-950">{job.title}</h1>
              {job.isDemo && <DemoBadge />}
            </div>
            <p className="mt-1 text-ink-600">{job.companyNameRaw}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-ink-500">
              <span className="inline-flex items-center gap-1"><Briefcase size={14} /> {contractLabel(job.contractType)}</span>
              {job.city && <span className="inline-flex items-center gap-1"><MapPin size={14} /> {job.city}, {job.region}</span>}
              {job.hoursPerWeek && <span className="inline-flex items-center gap-1"><Clock size={14} /> {job.hoursPerWeek}h/semaine</span>}
              <span className="inline-flex items-center gap-1"><Wifi size={14} /> {remoteLabel(job.remoteType)}</span>
              {salary && <span className="inline-flex items-center gap-1"><Euro size={14} /> {salary}</span>}
            </div>
            <p className="mt-2 text-xs text-ink-400">
              {formatFreshness(job.lastVerifiedAt)} · Publiée le {formatDate(job.publishedAt)} · Source : {job.sourceName}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={job.url} target="_blank" rel="noopener noreferrer" className="btn-primary">
            <ExternalLink size={16} /> Postuler sur le site source
          </a>
          <button onClick={toggleFavorite} disabled={!session} className="btn-secondary">
            <Heart size={16} className={saved ? "fill-danger-500 text-danger-500" : ""} /> {saved ? "Enregistré" : "Ajouter aux favoris"}
          </button>
          <button onClick={() => markApplication("TO_PREPARE")} disabled={!session} className="btn-secondary">
            <ClipboardList size={16} /> Suivre cette candidature
          </button>
          {(job.contactEmail || job.contactPhone) && (
            <div className="flex items-center gap-3 text-sm text-ink-600">
              {job.contactEmail && <a href={`mailto:${job.contactEmail}`} className="inline-flex items-center gap-1 hover:underline"><Mail size={14} /> {job.contactEmail}</a>}
              {job.contactPhone && <a href={`tel:${job.contactPhone}`} className="inline-flex items-center gap-1 hover:underline"><Phone size={14} /> {job.contactPhone}</a>}
            </div>
          )}
        </div>
        {applyStatus && (
          <p className="mt-2 text-sm text-accent-600">
            Candidature ajoutée à votre suivi ({applyStatus === "TO_PREPARE" ? "à préparer" : applyStatus}).{" "}
            <Link href="/applications" className="underline">Voir mes candidatures</Link>
          </p>
        )}
        {!session && (
          <p className="mt-2 text-sm text-ink-500">
            <Link href="/login" className="text-brand-600 underline">Connectez-vous</Link> pour voir votre score de
            compatibilité personnalisé, sauvegarder cette offre et générer une lettre de motivation.
          </p>
        )}

        {/* Personalized analysis */}
        {match && (
          <div className="card mt-6">
            <h2 className="font-display text-lg font-semibold text-ink-900">
              Pourquoi cette offre vous correspond
            </h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-accent-600">Points forts</h3>
                <ul className="space-y-1.5 text-sm text-ink-600">
                  {match.strengths.length === 0 && <li className="text-ink-400">Aucun point fort marquant identifié.</li>}
                  {match.strengths.map((s, i) => (
                    <li key={i} className="flex gap-1.5"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-accent-500" /> {s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-warn-600">Points à vérifier</h3>
                <ul className="space-y-1.5 text-sm text-ink-600">
                  {match.weaknesses.length === 0 && <li className="text-ink-400">Aucun point faible majeur identifié.</li>}
                  {match.weaknesses.map((w, i) => (
                    <li key={i} className="flex gap-1.5"><AlertTriangle size={15} className="mt-0.5 shrink-0 text-warn-500" /> {w}</li>
                  ))}
                </ul>
              </div>
            </div>
            {match.advice.length > 0 && (
              <div className="mt-4 rounded-lg bg-brand-50 p-3">
                <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                  <Sparkles size={15} /> Conseils
                </h3>
                <ul className="space-y-1 text-sm text-brand-700">
                  {match.advice.map((a, i) => <li key={i}>• {a}</li>)}
                </ul>
              </div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {match.dimensions.map((d) => (
                <div key={d.key} className="rounded-lg bg-ink-50 p-2.5 text-center">
                  <p className="text-lg font-bold text-ink-900">{Math.round(d.score)}%</p>
                  <p className="text-xs text-ink-500">{d.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div className="card mt-6">
          <h2 className="font-display text-lg font-semibold text-ink-900">Missions</h2>
          <p className="mt-2 whitespace-pre-line text-sm text-ink-600">{job.missions || job.description}</p>
        </div>

        <div className="card mt-6">
          <h2 className="font-display text-lg font-semibold text-ink-900">Profil recherché</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {job.requiredSkills.map((s) => <span key={s} className="badge bg-brand-50 text-brand-700">{s}</span>)}
          </div>
          <dl className="mt-3 grid gap-2 text-sm text-ink-600 sm:grid-cols-2">
            <div><dt className="text-ink-400">Niveau d&apos;expérience</dt><dd>{experienceLabel(job.experienceLevel)}</dd></div>
            {job.requiredDegree && <div><dt className="text-ink-400">Diplôme</dt><dd>{job.requiredDegree}</dd></div>}
            {job.languages.length > 0 && <div><dt className="text-ink-400">Langues</dt><dd>{job.languages.join(", ")}</dd></div>}
            {job.schedule && <div><dt className="text-ink-400">Horaires</dt><dd>{job.schedule}</dd></div>}
          </dl>
        </div>

        {/* Cover letter generation */}
        {session && (
          <div className="card mt-6">
            <h2 className="font-display text-lg font-semibold text-ink-900">Préparer ma candidature</h2>
            <p className="mt-1 text-sm text-ink-500">
              Génère une lettre de motivation à partir de votre profil réel — rien n&apos;est inventé.
            </p>
            <button onClick={generateCoverLetter} disabled={generating} className="btn-secondary mt-3">
              {generating ? "Génération..." : "Générer ma lettre de motivation"}
            </button>
            {error && <p className="mt-2 text-sm text-danger-600">{error}</p>}
            {coverLetter && (
              <textarea
                className="input mt-3"
                rows={14}
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
