"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Download, Trash2, AlertTriangle } from "lucide-react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function exportData() {
    const res = await fetch("/api/account/export");
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mes-donnees-jobmatch.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function deleteAccount() {
    setDeleting(true);
    setError(null);
    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setDeleting(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Erreur lors de la suppression.");
      return;
    }
    await signOut({ redirect: false });
    router.push("/");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-16">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-950">Paramètres</h1>
        <p className="text-sm text-ink-500">{session?.user?.email}</p>
      </div>

      <div className="card">
        <h2 className="font-display text-lg font-semibold text-ink-900">Vos données</h2>
        <p className="mt-1 text-sm text-ink-500">
          Conformément au RGPD, vous pouvez exporter l&apos;ensemble de vos données à tout moment.
        </p>
        <button onClick={exportData} className="btn-secondary mt-3">
          <Download size={16} /> Exporter mes données (JSON)
        </button>
      </div>

      <div className="card border border-danger-100">
        <h2 className="font-display text-lg font-semibold text-danger-600">Zone dangereuse</h2>
        <p className="mt-1 text-sm text-ink-500">
          La suppression de votre compte est définitive et irréversible : votre profil, vos CV, vos
          candidatures, favoris et alertes seront supprimés.
        </p>
        {!confirmOpen ? (
          <button onClick={() => setConfirmOpen(true)} className="btn-danger mt-3">
            <Trash2 size={16} /> Supprimer mon compte
          </button>
        ) : (
          <div className="mt-3 space-y-3 rounded-lg bg-danger-100 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-danger-600">
              <AlertTriangle size={16} /> Confirmez avec votre mot de passe
            </p>
            <input
              type="password"
              className="input"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="text-sm text-danger-600">{error}</p>}
            <div className="flex gap-2">
              <button onClick={deleteAccount} disabled={deleting || !password} className="btn-danger">
                {deleting ? "Suppression..." : "Confirmer la suppression définitive"}
              </button>
              <button onClick={() => setConfirmOpen(false)} className="btn-ghost">Annuler</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
