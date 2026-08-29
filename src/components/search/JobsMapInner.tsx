"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import Link from "next/link";
import { contractLabel, formatSalary } from "@/lib/format";
import type { JobListItem } from "@/types/job";

/**
 * The actual Leaflet map. Split into its own file (dynamically imported
 * with ssr:false from JobsMap.tsx) because Leaflet touches `window` at
 * import time and will throw during server-side rendering otherwise.
 *
 * Markers are custom inline-SVG div icons (no external marker image
 * asset), colored by match score using the same thresholds as
 * MatchScoreRing, so the map reads consistently with the rest of the UI
 * and never shows Leaflet's classic "broken image" default-marker bug.
 *
 * Clustering: at demo scale (a few dozen listings) individual markers stay
 * legible without a clustering library. react-leaflet-cluster (the
 * natural choice) currently requires React 19 + react-leaflet v5, which
 * would conflict with this project's React 18 baseline (chosen
 * deliberately for stability — see README). If real ingestion grows the
 * marker count into the hundreds, swap this component's marker rendering
 * for a clustering library at that point; the map/data plumbing here
 * doesn't need to change.
 */

function markerColor(score: number | null): string {
  if (score == null) return "#535c78"; // ink-500, neutral for unscored jobs
  if (score >= 80) return "#14b090"; // accent-500
  if (score >= 60) return "#3866e3"; // brand-500
  if (score >= 40) return "#d97706"; // warn-500
  return "#e0364c"; // danger-500
}

function buildIcon(score: number | null): L.DivIcon {
  const color = markerColor(score);
  return L.divIcon({
    className: "",
    html: `<svg width="28" height="38" viewBox="0 0 28 38" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 24 14 24s14-13.5 14-24C28 6.3 21.7 0 14 0z" fill="${color}"/>
      <circle cx="14" cy="14" r="6.5" fill="white"/>
    </svg>`,
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -34],
  });
}

function userIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="8" fill="#3866e3" fill-opacity="0.25"/>
      <circle cx="10" cy="10" r="4" fill="#3866e3" stroke="white" stroke-width="2"/>
    </svg>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 12);
    } else {
      map.fitBounds(points, { padding: [40, 40], maxZoom: 13 });
    }
  }, [map, points]);
  return null;
}

export default function JobsMapInner({
  jobs,
  origin,
}: {
  jobs: JobListItem[];
  origin: { latitude: number; longitude: number } | null;
}) {
  const jobPoints = jobs.filter(
    (j): j is JobListItem & { latitude: number; longitude: number } =>
      j.latitude != null && j.longitude != null
  );

  const points: [number, number][] = jobPoints.map((j) => [j.latitude, j.longitude]);
  const center: [number, number] = origin
    ? [origin.latitude, origin.longitude]
    : points[0] ?? [46.6, 1.88]; // fallback: geographic center of France

  return (
    <MapContainer
      center={center}
      zoom={points.length ? 6 : 5}
      scrollWheelZoom
      style={{ height: "100%", width: "100%", borderRadius: "1.25rem" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={origin ? [...points, [origin.latitude, origin.longitude]] : points} />

      {origin && (
        <Marker position={[origin.latitude, origin.longitude]} icon={userIcon()}>
          <Popup>Votre position</Popup>
        </Marker>
      )}

      {jobPoints.map((job) => (
        <Marker
          key={job.id}
          position={[job.latitude, job.longitude]}
          icon={buildIcon(job.match?.score ?? null)}
        >
          <Popup>
            <div className="min-w-[180px]">
              <p className="font-semibold text-ink-900">{job.title}</p>
              <p className="text-xs text-ink-500">{job.companyNameRaw}</p>
              <p className="mt-1 text-xs text-ink-500">
                {contractLabel(job.contractType)}
                {formatSalary(job.salaryMin, job.salaryMax, job.salaryPeriod)
                  ? ` · ${formatSalary(job.salaryMin, job.salaryMax, job.salaryPeriod)}`
                  : ""}
              </p>
              {job.match && (
                <p className="mt-1 text-xs font-medium text-brand-600">
                  {Math.round(job.match.score)}% compatible
                </p>
              )}
              <Link href={`/jobs/${job.id}`} className="mt-2 inline-block text-xs font-medium text-brand-600 underline">
                Voir l&apos;offre
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
