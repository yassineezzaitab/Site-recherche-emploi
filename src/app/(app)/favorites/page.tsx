"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { contractLabel, formatSalary } from "@/lib/format";

interface SavedJobItem {
  id: string;
  note: string | null;
  createdAt: string;
  job: {
    id: string; title: string; companyNameRaw: string; city: string | null; contractType: string;
    salaryMin: number | null; salaryMax: number | null; salaryPeriod: string | null;
    source?: { kind: string };
  };
}

export default function FavoritesPage() {
  const [items, setItems] = useState<SavedJobItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/favorites")
      .then((r) => r.json())
      .then((data) => {
        setItems(data.saved ?? []);
        setLoading(false);
      });
  }, []);

  async function updateNote(id: string, note: string) {
    setItems((items) => items.map((i) => (i.id === id ? { ...i, note } : i)));
    await fetch(`/api/favorites/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
  }

  async function remove(id: string) {
    setItems((items) => items.filter((i) => i.id !== id));
    await fetch(`/api/favorites/${id}`, { method: "DELETE" });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-16">
      <h1 className="font-display text-2xl font-bold text-ink-950">Mes favoris</h1>
      {loading && <p className="text-sm text-ink-400">Chargement...</p>}
      {!loading && items.length === 0 && (
        <div className="card text-sm text-ink-500">
          Aucune offre enregistrée. Ajoutez des offres à vos favoris depuis leur page de détail.
        </div>
      )}
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link href={`/jobs/${item.job.id}`} className="font-display text-base font-semibold text-ink-900 hover:text-brand-600">
                  {item.job.title}
                </Link>
                <p className="text-sm text-ink-500">{item.job.companyNameRaw} · {item.job.city}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <span className="badge bg-ink-100 text-ink-700">{contractLabel(item.job.contractType)}</span>
                  {formatSalary(item.job.salaryMin, item.job.salaryMax, item.job.salaryPeriod) && (
                    <span className="badge bg-ink-100 text-ink-700">
                      {formatSalary(item.job.salaryMin, item.job.salaryMax, item.job.salaryPeriod)}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => remove(item.id)} className="text-ink-400 hover:text-danger-500" aria-label="Retirer">
                <Trash2 size={18} />
              </button>
            </div>
            <textarea
              className="input mt-3"
              rows={2}
              placeholder="Note personnelle..."
              defaultValue={item.note ?? ""}
              onBlur={(e) => updateNote(item.id, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
