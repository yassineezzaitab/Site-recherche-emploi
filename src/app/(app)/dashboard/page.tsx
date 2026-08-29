"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Heart, ClipboardList, BellRing, ArrowRight, type LucideIcon } from "lucide-react";
import { JobCard } from "@/components/job/JobCard";
import type { JobListItem } from "@/types/job";

interface DashboardData {
  hasProfile: boolean;
  newJobsToday: number;
  savedCount: number;
  applicationsCount: number;
  activeAlertsCount: number;
  recentNotifications: { id: string; title: string; body: string; createdAt: string }[];
  topMatches: JobListItem[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard").then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <div className="text-sm text-ink-400">Chargement...</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-950">Tableau de bord</h1>
        <p className="text-sm text-ink-500">
          {data.newJobsToday} nouvelle{data.newJobsToday !== 1 ? "s" : ""} offre{data.newJobsToday !== 1 ? "s" : ""}{" "}
          publiée{data.newJobsToday !== 1 ? "s" : ""} aujourd&apos;hui.
        </p>
      </div>

      {!data.hasProfile && (
        <div className="card flex items-center justify-between gap-4 bg-brand-50">
          <div>
            <p className="font-medium text-brand-800">Complétez votre profil pour activer le matching</p>
            <p className="text-sm text-brand-600">Importez votre CV pour des recommandations personnalisées.</p>
          </div>
          <Link href="/profile" className="btn-primary shrink-0">Compléter mon profil</Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Heart} label="Favoris" value={data.savedCount} href="/favorites" />
        <StatCard icon={ClipboardList} label="Candidatures" value={data.applicationsCount} href="/applications" />
        <StatCard icon={BellRing} label="Alertes actives" value={data.activeAlertsCount} href="/alerts" />
        <StatCard icon={Sparkles} label="Offres du jour" value={data.newJobsToday} href="/search" />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink-900">Meilleures correspondances</h2>
          <Link href="/search" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
            Voir tout <ArrowRight size={14} />
          </Link>
        </div>
        <div className="space-y-3">
          {data.topMatches.map((job) => <JobCard key={job.id} job={job} />)}
          {data.topMatches.length === 0 && (
            <div className="card text-sm text-ink-500">
              Aucune correspondance pour le moment — complétez votre profil ou explorez la recherche.
            </div>
          )}
        </div>
      </div>

      {data.recentNotifications.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-lg font-semibold text-ink-900">Notifications récentes</h2>
          <div className="card divide-y divide-ink-100 p-0">
            {data.recentNotifications.map((n) => (
              <div key={n.id} className="p-4">
                <p className="text-sm font-medium text-ink-900">{n.title}</p>
                <p className="text-sm text-ink-500">{n.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, href }: { icon: LucideIcon; label: string; value: number; href: string }) {
  return (
    <Link href={href} className="card flex flex-col gap-2 transition-shadow hover:shadow-elevated">
      <Icon size={18} />
      <p className="text-2xl font-bold text-ink-950">{value}</p>
      <p className="text-xs text-ink-500">{label}</p>
    </Link>
  );
}
