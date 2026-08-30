"use client";

import { useEffect, useState } from "react";
import { Trash2, Plus, BellRing } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { HigurashiMotif } from "@/components/ui/motifs";

interface AlertItem {
  id: string;
  name: string;
  isActive: boolean;
  minScore: number;
  lastCheckedAt: string | null;
  query: { q?: string };
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [name, setName] = useState("");
  const [q, setQ] = useState("");
  const [minScore, setMinScore] = useState(70);
  const [loading, setLoading] = useState(true);

  function load() {
    fetch("/api/alerts").then((r) => r.json()).then((data) => {
      setAlerts(data.alerts ?? []);
      setLoading(false);
    });
  }

  useEffect(() => { load(); }, []);

  async function createAlert(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, query: { q }, minScore }),
    });
    setName("");
    setQ("");
    load();
  }

  async function toggle(id: string, isActive: boolean) {
    setAlerts((a) => a.map((x) => (x.id === id ? { ...x, isActive } : x)));
    await fetch(`/api/alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
  }

  async function remove(id: string) {
    setAlerts((a) => a.filter((x) => x.id !== id));
    await fetch(`/api/alerts/${id}`, { method: "DELETE" });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-16">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-950">Alertes</h1>
        <p className="text-sm text-ink-500">
          Enregistrez une recherche : vous serez notifié dès qu&apos;une nouvelle offre correspond.
        </p>
      </div>

      <form onSubmit={createAlert} className="card space-y-3">
        <h2 className="font-display text-base font-semibold text-ink-900">Nouvelle alerte</h2>
        <div>
          <label className="label">Nom de l&apos;alerte</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Jobs étudiants — Paris — soir" />
        </div>
        <div>
          <label className="label">Recherche (langage naturel ou mots-clés)</label>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex : job étudiant marketing 15h semaine" />
        </div>
        <div>
          <label className="label">Score minimum ({minScore}%)</label>
          <input type="range" min={40} max={95} step={5} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="w-full" />
        </div>
        <button type="submit" className="btn-primary"><Plus size={16} /> Créer l&apos;alerte</button>
      </form>

      {loading ? (
        <p className="text-sm text-ink-400">Chargement...</p>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div key={alert.id} className="card flex items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 font-medium text-ink-900">
                  <BellRing size={16} className={alert.isActive ? "text-brand-600" : "text-ink-300"} />
                  {alert.name}
                </p>
                <p className="text-xs text-ink-500">
                  {alert.query.q ? `"${alert.query.q}" · ` : ""}seuil {alert.minScore}%
                  {alert.lastCheckedAt ? ` · vérifiée le ${new Date(alert.lastCheckedAt).toLocaleDateString("fr-FR")}` : " · pas encore vérifiée"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-ink-500">
                  <input type="checkbox" checked={alert.isActive} onChange={(e) => toggle(alert.id, e.target.checked)} />
                  Active
                </label>
                <button onClick={() => remove(alert.id)} className="text-ink-400 hover:text-danger-500" aria-label="Supprimer">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {alerts.length === 0 && (
            <EmptyState
              motif={<HigurashiMotif />}
              message="Aucune alerte pour le moment. Créez une alerte pour être averti dès qu'une offre correspond — même dans le calme, ça vaut le coup de rester à l'écoute."
            />
          )}
        </div>
      )}
    </div>
  );
}
