"use client";

import { useEffect, useState } from "react";
import { UploadCloud, Loader2, CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import type { ResumeExtraction } from "@/lib/resume/parseResume";
import { AstaMotif } from "@/components/ui/motifs";

const MAX_SIZE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".txt"];

// Rotates during analysis so the wait doesn't feel static — reads as
// ordinary encouragement, but each line quietly echoes a story about
// patience paying off (a slow-burn mystery, a lone apprentice, a long
// road to redemption).
const ANALYZING_MESSAGES = [
  "On rassemble les indices, comme dans une bonne enquête d'été.",
  "Chaque compétence compte, un pas de plus vers l'objectif.",
  "Pas besoin d'être le plus fort au départ — juste de ne rien lâcher.",
  "La patience d'aujourd'hui prépare la force de demain.",
  "Presque terminé…",
];

function isAcceptedFile(file: File) {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function CvUpload({ onExtracted }: { onExtracted: (extraction: ResumeExtraction) => void }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "selected" | "uploading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (status !== "uploading") {
      setMessageIndex(0);
      return;
    }
    const id = setInterval(() => setMessageIndex((i) => (i + 1) % ANALYZING_MESSAGES.length), 2200);
    return () => clearInterval(id);
  }, [status]);

  function selectFile(file: File) {
    if (!isAcceptedFile(file)) {
      setStatus("error");
      setError("Format non supporté. Utilisez un fichier PDF, DOCX ou TXT.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setStatus("error");
      setError("Ce fichier dépasse la taille maximale autorisée (8 Mo).");
      return;
    }
    setSelectedFile(file);
    setError(null);
    setStatus("selected");
  }

  async function analyzeSelectedFile() {
    if (!selectedFile) return;
    setStatus("uploading");
    setError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("/api/resume/upload", { method: "POST", body: formData });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setStatus("error");
        setError(
          data?.error ??
            "Impossible d'analyser votre CV pour le moment. Vérifiez le format et la taille du fichier puis réessayez."
        );
        return;
      }
      setStatus("done");
      onExtracted(data.extraction);
    } catch {
      setStatus("error");
      setError("Une erreur réseau est survenue. Vérifiez votre connexion puis réessayez.");
    }
  }

  return (
    <div className="card">
      <h2 className="font-display text-lg font-semibold text-ink-900">Importer mon CV</h2>
      <p className="mt-1 text-sm text-ink-500">
        PDF, DOCX ou TXT — 8 Mo maximum. Nous analysons le contenu pour pré-remplir votre profil ;
        vous pourrez tout modifier avant de valider.
      </p>

      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file) selectFile(file);
        }}
        htmlFor="cv-file-input"
        className="mt-4 flex min-h-[9rem] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl2 border-2 border-dashed border-ink-200 bg-ink-50 px-6 py-8 text-center transition-colors hover:border-brand-400 hover:bg-brand-50"
      >
        {/*
          A <label htmlFor> click natively opens the file picker without any
          JS — more reliable than a synthetic input.click(). The input also
          uses "sr-only" (kept in the layout, just visually hidden) rather
          than display:none: WebKit (Safari/iPadOS) does not consistently
          honor .click() on a display:none file input, which silently
          no-ops the picker on iPad/iPhone.
        */}
        <input
          id="cv-file-input"
          type="file"
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) selectFile(file);
          }}
        />
        {status === "uploading" ? (
          <>
            <Loader2 className="animate-spin text-brand-600" size={28} />
            <p className="text-sm text-ink-600">Analyse de {selectedFile?.name}…</p>
            <p className="text-xs text-ink-400">{ANALYZING_MESSAGES[messageIndex]}</p>
          </>
        ) : status === "done" ? (
          <>
            <div className="relative">
              <CheckCircle2 className="text-accent-500" size={28} />
              <AstaMotif size={16} className="absolute -right-2 -top-2 motion-safe:animate-fade-in" />
            </div>
            <p className="text-sm font-medium text-ink-700">{selectedFile?.name} analysé avec succès.</p>
            <p className="text-xs text-brand-600">Touchez pour importer un autre fichier</p>
          </>
        ) : selectedFile ? (
          <>
            <FileText className="text-brand-600" size={28} />
            <p className="text-sm font-medium text-ink-700">CV sélectionné : {selectedFile.name}</p>
            <p className="text-xs text-ink-500">Touchez pour choisir un autre fichier</p>
          </>
        ) : (
          <>
            <UploadCloud className="text-ink-400" size={28} />
            <p className="text-sm text-ink-600">
              Glissez-déposez votre CV ici, ou touchez pour choisir un fichier
            </p>
          </>
        )}
      </label>

      {selectedFile && status !== "uploading" && status !== "done" && (
        <button
          type="button"
          onClick={analyzeSelectedFile}
          className="btn-primary mt-3 w-full py-3 text-base"
        >
          Analyser mon CV
        </button>
      )}

      {status === "error" && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-danger-100 px-3 py-2 text-sm text-danger-600">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
