"use client";

import { useRef, useState } from "react";
import { UserRound, Loader2, X } from "lucide-react";

const MAX_SIZE_BYTES = 4 * 1024 * 1024;
const ACCEPTED = "image/jpeg,image/png,image/webp";

/**
 * CVs are text-only (pdf-parse/mammoth never extract embedded images), so
 * there is no "photo found in your CV" path — this is a manual upload only.
 */
export function ProfilePhoto({
  hasPhoto,
  onChange,
}: {
  hasPhoto: boolean;
  onChange: (hasPhoto: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  async function handleFile(file: File) {
    setError(null);
    if (file.size > MAX_SIZE_BYTES) {
      setError("La photo dépasse 4 Mo.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Formats acceptés : JPG, PNG, WEBP.");
      return;
    }
    setBusy(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/profile/photo", { method: "POST", body: formData });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Échec de l'envoi de la photo.");
      return;
    }
    setVersion((v) => v + 1);
    onChange(true);
  }

  async function handleRemove() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/profile/photo", { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setError("Échec de la suppression de la photo.");
      return;
    }
    onChange(false);
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink-100 ring-1 ring-ink-200">
        {hasPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element -- private, per-user image served by our own API route, not eligible for next/image's static optimization
          <img
            key={version}
            src={`/api/profile/photo?v=${version}`}
            alt="Photo de profil"
            className="h-full w-full object-cover"
          />
        ) : (
          <UserRound size={32} className="text-ink-400" />
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Loader2 size={20} className="animate-spin text-brand-600" />
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <label className="btn-secondary cursor-pointer text-sm">
            {hasPhoto ? "Changer la photo" : "Ajouter une photo"}
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
          </label>
          {hasPhoto && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              className="btn-ghost inline-flex items-center gap-1 text-sm text-danger-600"
            >
              <X size={14} /> Retirer
            </button>
          )}
        </div>
        <p className="text-xs text-ink-400">JPG, PNG ou WEBP, 4 Mo max.</p>
        {error && <p className="text-xs text-danger-600">{error}</p>}
      </div>
    </div>
  );
}
