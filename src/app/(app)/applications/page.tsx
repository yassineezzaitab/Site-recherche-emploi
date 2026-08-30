"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { AstaMotif } from "@/components/ui/motifs";

const CELEBRATION_STATUSES: Record<string, string> = {
  INTERVIEW: "Un entretien décroché ! Zéro relation, zéro piston — juste le travail qui a payé.",
  ACCEPTED: "Candidature acceptée. Ce qui compte, ce n'est pas le point de départ.",
};

interface ApplicationItem {
  id: string;
  status: string;
  notes: string | null;
  updatedAt: string;
  job: { id: string; title: string; companyNameRaw: string; city: string | null };
}

const STATUSES = [
  { key: "TO_REVIEW", label: "À examiner" },
  { key: "TO_PREPARE", label: "À préparer" },
  { key: "SENT", label: "Envoyée" },
  { key: "INTERVIEW", label: "Entretien" },
  { key: "REJECTED", label: "Refusée" },
  { key: "ACCEPTED", label: "Acceptée" },
];

export default function ApplicationsPage() {
  const [items, setItems] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [celebration, setCelebration] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/applications")
      .then((r) => r.json())
      .then((data) => {
        setItems(data.applications ?? []);
        setLoading(false);
      });
  }, []);

  async function updateStatus(id: string, status: string) {
    setItems((items) => items.map((i) => (i.id === id ? { ...i, status } : i)));
    if (CELEBRATION_STATUSES[status]) {
      setCelebration(CELEBRATION_STATUSES[status]);
      setTimeout(() => setCelebration(null), 5000);
    }
    await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  return (
    <div className="pb-16">
      <h1 className="font-display text-2xl font-bold text-ink-950">Mes candidatures</h1>
      {loading && <p className="mt-3 text-sm text-ink-400">Chargement...</p>}
      {celebration && (
        <div className="motion-safe:animate-fade-in mt-3 rounded-lg bg-accent-100 px-3 py-2 text-sm text-accent-600">
          {celebration}
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-4 pb-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {STATUSES.map(({ key, label }) => (
          <div key={key}>
            <h2 className="mb-2 text-sm font-semibold text-ink-700">
              {label} <span className="text-ink-400">({items.filter((i) => i.status === key).length})</span>
            </h2>
            <div className="space-y-2">
              {items
                .filter((i) => i.status === key)
                .map((item) => (
                  <div key={item.id} className="card p-3">
                    <Link href={`/jobs/${item.job.id}`} className="text-sm font-medium text-ink-900 hover:text-brand-600">
                      {item.job.title}
                    </Link>
                    <p className="text-xs text-ink-500">{item.job.companyNameRaw}</p>
                    <select
                      value={item.status}
                      onChange={(e) => updateStatus(item.id, e.target.value)}
                      className="input mt-2 text-xs"
                    >
                      {STATUSES.map((s) => (
                        <option key={s.key} value={s.key}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {!loading && items.length === 0 && (
        <div className="mt-4">
          <EmptyState
            motif={<AstaMotif />}
            message="Aucune candidature suivie pour le moment. Depuis la page d'une offre, cliquez sur « Suivre cette candidature » pour l'ajouter ici. Il ne faut pas grand-chose pour commencer — juste une première offre."
          />
        </div>
      )}
    </div>
  );
}
