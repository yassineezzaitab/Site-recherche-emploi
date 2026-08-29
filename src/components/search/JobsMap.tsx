"use client";

import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import type { JobListItem } from "@/types/job";

// Leaflet reads `window`/`document` at import time, so the actual map must
// never be part of the server-rendered bundle — ssr:false is required
// here, not just a nice-to-have.
const JobsMapInner = dynamic(() => import("./JobsMapInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center rounded-xl2 bg-ink-100 text-sm text-ink-400">
      Chargement de la carte...
    </div>
  ),
});

export function JobsMap({
  jobs,
  origin,
}: {
  jobs: JobListItem[];
  origin: { latitude: number; longitude: number } | null;
}) {
  const withCoords = jobs.filter((j) => j.latitude != null && j.longitude != null);

  if (withCoords.length === 0 && !origin) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-xl2 bg-ink-100 p-6 text-center text-sm text-ink-400">
        <p>Aucune offre géolocalisée à afficher pour cette recherche.</p>
        <p className="text-xs">
          Les offres sans coordonnées connues (ville non reconnue par le géocodeur) n&apos;apparaissent pas sur la carte.
        </p>
      </div>
    );
  }

  return <JobsMapInner jobs={jobs} origin={origin} />;
}
