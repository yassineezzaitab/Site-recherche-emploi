import Link from "next/link";
import { Briefcase, MapPin, Clock, Wifi } from "lucide-react";
import { MatchScoreRing } from "@/components/ui/MatchScore";
import { contractLabel, formatSalary, formatFreshness, remoteLabel } from "@/lib/format";
import type { JobListItem } from "@/types/job";

export function JobCard({ job, isDemo }: { job: JobListItem; isDemo?: boolean }) {
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryPeriod);

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="card flex flex-col gap-3 transition-shadow hover:shadow-elevated sm:flex-row sm:items-start"
    >
      {job.match && <MatchScoreRing score={job.match.score} />}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-base font-semibold text-ink-900">{job.title}</h3>
          {isDemo && (
            <span className="badge bg-warn-100 text-warn-600 text-[10px]">DÉMO</span>
          )}
        </div>
        <p className="text-sm text-ink-600">{job.companyNameRaw}</p>

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-500">
          <span className="inline-flex items-center gap-1">
            <Briefcase size={13} /> {contractLabel(job.contractType)}
          </span>
          {job.city && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={13} /> {job.city}
              {job.distanceKm != null ? ` · ${job.distanceKm} km` : ""}
            </span>
          )}
          {job.hoursPerWeek && (
            <span className="inline-flex items-center gap-1">
              <Clock size={13} /> {job.hoursPerWeek}h/semaine
            </span>
          )}
          {job.remoteType !== "ONSITE_ONLY" && (
            <span className="inline-flex items-center gap-1">
              <Wifi size={13} /> {remoteLabel(job.remoteType)}
            </span>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {salary && <span className="badge bg-ink-100 text-ink-700">{salary}</span>}
          {job.requiredSkills.slice(0, 3).map((s) => (
            <span key={s} className="badge bg-brand-50 text-brand-700">
              {s}
            </span>
          ))}
        </div>

        <p className="mt-2 text-xs text-ink-400">{formatFreshness(job.lastVerifiedAt)}</p>
      </div>
    </Link>
  );
}
