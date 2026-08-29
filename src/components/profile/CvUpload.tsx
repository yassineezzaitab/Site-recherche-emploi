"use client";

import { useRef, useState } from "react";
import { UploadCloud, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import type { ResumeExtraction } from "@/lib/resume/parseResume";

export function CvUpload({ onExtracted }: { onExtracted: (extraction: ResumeExtraction) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleFile(file: File) {
    setStatus("uploading");
    setError(null);
    setFileName(file.name);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/resume/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setError(data.error ?? "Échec de l'analyse du CV.");
        return;
      }
      setStatus("done");
      onExtracted(data.extraction);
    } catch {
      setStatus("error");
      setError("Une erreur réseau est survenue.");
    }
  }

  return (
    <div className="card">
      <h2 className="font-display text-lg font-semibold text-ink-900">Importer mon CV</h2>
      <p className="mt-1 text-sm text-ink-500">
        PDF, DOCX ou TXT — 8 Mo maximum. Nous analysons le contenu pour pré-remplir votre profil ;
        vous pourrez tout modifier avant de valider.
      </p>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl2 border-2 border-dashed border-ink-200 bg-ink-50 px-6 py-10 text-center transition-colors hover:border-brand-400 hover:bg-brand-50"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        {status === "uploading" ? (
          <>
            <Loader2 className="animate-spin text-brand-600" size={28} />
            <p className="text-sm text-ink-600">Analyse de {fileName}...</p>
          </>
        ) : status === "done" ? (
          <>
            <CheckCircle2 className="text-accent-500" size={28} />
            <p className="text-sm text-ink-600">{fileName} analysé avec succès.</p>
            <p className="text-xs text-brand-600">Cliquez pour importer un autre fichier</p>
          </>
        ) : (
          <>
            <UploadCloud className="text-ink-400" size={28} />
            <p className="text-sm text-ink-600">
              Glissez-déposez votre CV ici, ou cliquez pour sélectionner un fichier
            </p>
          </>
        )}
      </div>

      {status === "error" && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-danger-100 px-3 py-2 text-sm text-danger-600">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
