"use client";

import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import type { ResumeExtraction } from "@/lib/resume/parseResume";

export interface ReviewedExperience {
  company: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  description: string;
}
export interface ReviewedEducation {
  institution: string;
  degree: string | null;
  startDate: string | null;
  endDate: string | null;
}
export interface ReviewedLanguage {
  name: string;
  level: string | null;
}
export interface ReviewedCertification {
  name: string;
  issuer: string | null;
}

export interface ReviewedData {
  skills: string[];
  experiences: ReviewedExperience[];
  educations: ReviewedEducation[];
  languages: ReviewedLanguage[];
  certifications: ReviewedCertification[];
  city: string | null;
  phone: string | null;
}

export function ExtractionReview({
  extraction,
  onApply,
  applying,
}: {
  extraction: ResumeExtraction;
  onApply: (data: ReviewedData) => void;
  applying: boolean;
}) {
  const [skills, setSkills] = useState(extraction.skills.map((s) => s.name));
  const [experiences, setExperiences] = useState<ReviewedExperience[]>(
    extraction.experiences.map((e) => ({
      company: e.company,
      title: e.title,
      startDate: e.startDate,
      endDate: e.endDate,
      isCurrent: e.isCurrent,
      description: e.description,
    }))
  );
  const [educations, setEducations] = useState<ReviewedEducation[]>(
    extraction.educations.map((e) => ({
      institution: e.institution,
      degree: e.degree,
      startDate: e.startDate,
      endDate: e.endDate,
    }))
  );
  const [languages, setLanguages] = useState<ReviewedLanguage[]>(extraction.languages);
  const [certifications, setCertifications] = useState<ReviewedCertification[]>(
    extraction.certifications
  );

  return (
    <div className="card">
      <h2 className="font-display text-lg font-semibold text-ink-900">
        Informations détectées dans votre CV
      </h2>
      <p className="mt-1 text-sm text-ink-500">
        Vérifiez et corrigez ces informations avant de les ajouter à votre profil. Rien n&apos;est
        inventé : tout provient littéralement de votre document.
      </p>

      {extraction.warnings.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {extraction.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg bg-warn-100 px-3 py-2 text-xs text-warn-600">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {w}
            </div>
          ))}
        </div>
      )}

      <section className="mt-5">
        <h3 className="text-sm font-semibold text-ink-800">Compétences ({skills.length})</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {skills.map((s, i) => (
            <span key={s} className="badge bg-brand-50 text-brand-700">
              {s}
              <button
                onClick={() => setSkills(skills.filter((_, idx) => idx !== i))}
                className="ml-1 text-brand-400 hover:text-danger-500"
                aria-label={`Retirer ${s}`}
              >
                ×
              </button>
            </span>
          ))}
          {skills.length === 0 && <p className="text-sm text-ink-400">Aucune compétence détectée.</p>}
        </div>
      </section>

      <section className="mt-5">
        <h3 className="text-sm font-semibold text-ink-800">
          Expériences ({experiences.length})
        </h3>
        <div className="mt-2 space-y-3">
          {experiences.map((exp, i) => (
            <div key={i} className="rounded-lg border border-ink-100 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="grid flex-1 gap-2 sm:grid-cols-2">
                  <input
                    className="input"
                    value={exp.title}
                    onChange={(e) =>
                      setExperiences(
                        experiences.map((x, idx) => (idx === i ? { ...x, title: e.target.value } : x))
                      )
                    }
                    placeholder="Intitulé du poste"
                  />
                  <input
                    className="input"
                    value={exp.company}
                    onChange={(e) =>
                      setExperiences(
                        experiences.map((x, idx) => (idx === i ? { ...x, company: e.target.value } : x))
                      )
                    }
                    placeholder="Entreprise"
                  />
                </div>
                <button
                  onClick={() => setExperiences(experiences.filter((_, idx) => idx !== i))}
                  className="text-ink-400 hover:text-danger-500"
                  aria-label="Supprimer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <textarea
                className="input mt-2"
                rows={2}
                value={exp.description}
                onChange={(e) =>
                  setExperiences(
                    experiences.map((x, idx) => (idx === i ? { ...x, description: e.target.value } : x))
                  )
                }
                placeholder="Description des missions"
              />
            </div>
          ))}
          {experiences.length === 0 && (
            <p className="text-sm text-ink-400">Aucune expérience détectée.</p>
          )}
        </div>
      </section>

      <section className="mt-5">
        <h3 className="text-sm font-semibold text-ink-800">Formations ({educations.length})</h3>
        <div className="mt-2 space-y-3">
          {educations.map((edu, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-ink-100 p-3">
              <div className="grid flex-1 gap-2 sm:grid-cols-2">
                <input
                  className="input"
                  value={edu.degree ?? ""}
                  onChange={(e) =>
                    setEducations(
                      educations.map((x, idx) => (idx === i ? { ...x, degree: e.target.value } : x))
                    )
                  }
                  placeholder="Diplôme"
                />
                <input
                  className="input"
                  value={edu.institution}
                  onChange={(e) =>
                    setEducations(
                      educations.map((x, idx) => (idx === i ? { ...x, institution: e.target.value } : x))
                    )
                  }
                  placeholder="Établissement"
                />
              </div>
              <button
                onClick={() => setEducations(educations.filter((_, idx) => idx !== i))}
                className="text-ink-400 hover:text-danger-500"
                aria-label="Supprimer"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {educations.length === 0 && <p className="text-sm text-ink-400">Aucune formation détectée.</p>}
        </div>
      </section>

      <section className="mt-5">
        <h3 className="text-sm font-semibold text-ink-800">Langues ({languages.length})</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {languages.map((l, i) => (
            <span key={l.name} className="badge bg-ink-100 text-ink-700">
              {l.name}
              {l.level ? ` — ${l.level}` : ""}
              <button
                onClick={() => setLanguages(languages.filter((_, idx) => idx !== i))}
                className="ml-1 text-ink-400 hover:text-danger-500"
              >
                ×
              </button>
            </span>
          ))}
          {languages.length === 0 && <p className="text-sm text-ink-400">Aucune langue détectée.</p>}
        </div>
      </section>

      {extraction.interests.length > 0 && (
        <section className="mt-5">
          <h3 className="text-sm font-semibold text-ink-800">
            Centres d&apos;intérêt ({extraction.interests.length})
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {extraction.interests.map((interest) => (
              <span key={interest} className="badge bg-ink-100 text-ink-700">
                {interest}
              </span>
            ))}
          </div>
        </section>
      )}

      {extraction.links.length > 0 && (
        <section className="mt-5">
          <h3 className="text-sm font-semibold text-ink-800">Liens ({extraction.links.length})</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {extraction.links.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="badge bg-brand-50 text-brand-700 hover:underline"
              >
                {link.label}
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="mt-5">
        <h3 className="text-sm font-semibold text-ink-800">
          Certifications ({certifications.length})
        </h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {certifications.map((c, i) => (
            <span key={c.name} className="badge bg-ink-100 text-ink-700">
              {c.name}
              <button
                onClick={() => setCertifications(certifications.filter((_, idx) => idx !== i))}
                className="ml-1 text-ink-400 hover:text-danger-500"
              >
                ×
              </button>
            </span>
          ))}
          {certifications.length === 0 && (
            <p className="text-sm text-ink-400">Aucune certification détectée.</p>
          )}
        </div>
      </section>

      <button
        onClick={() =>
          onApply({
            skills,
            experiences,
            educations,
            languages,
            certifications,
            city: extraction.city,
            phone: extraction.phone,
          })
        }
        disabled={applying}
        className="btn-primary mt-6"
      >
        {applying ? "Ajout en cours..." : "Ajouter ces informations à mon profil"}
      </button>
    </div>
  );
}
