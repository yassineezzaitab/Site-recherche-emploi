import { prisma } from "@/lib/prisma";
import { searchJobs, type SearchFilters } from "@/lib/jobs/search";
import { loadProfileForMatching } from "@/lib/matching/service";

export interface AlertCheckSummary {
  alertId: string;
  userId: string;
  newNotifications: number;
}

/**
 * Re-runs every active saved search (§19) and creates a notification for
 * any job that (a) matches the alert's criteria, (b) scores at or above
 * the alert's minimum compatibility threshold, and (c) hasn't already
 * triggered a notification for this alert. Meant to run on a schedule
 * (see scripts/check-alerts.ts and the /api/cron/check-alerts route).
 */
export async function checkAllAlerts(): Promise<AlertCheckSummary[]> {
  const alerts = await prisma.alert.findMany({ where: { isActive: true } });
  const summaries: AlertCheckSummary[] = [];

  for (const alert of alerts) {
    let profileInput;
    try {
      profileInput = await loadProfileForMatching(alert.userId);
    } catch {
      summaries.push({ alertId: alert.id, userId: alert.userId, newNotifications: 0 });
      continue;
    }

    const filters = (alert.query as SearchFilters) ?? {};
    const result = await searchJobs({ ...filters, sort: "match", pageSize: 50 }, profileInput);

    const qualifying = result.items.filter(
      (item) => item.match && item.match.score >= alert.minScore
    );

    let created = 0;
    for (const item of qualifying) {
      const alreadyNotified = await prisma.notification.findFirst({
        where: { alertId: alert.id, jobId: item.job.id },
        select: { id: true },
      });
      if (alreadyNotified) continue;

      await prisma.notification.create({
        data: {
          userId: alert.userId,
          alertId: alert.id,
          jobId: item.job.id,
          type: "NEW_MATCH",
          title: `Nouvelle offre compatible à ${Math.round(item.match!.score)}%`,
          body: `"${item.job.title}" chez ${item.job.companyNameRaw} correspond à votre alerte "${alert.name}".`,
        },
      });
      created += 1;
    }

    await prisma.alert.update({ where: { id: alert.id }, data: { lastCheckedAt: new Date() } });
    summaries.push({ alertId: alert.id, userId: alert.userId, newNotifications: created });
  }

  return summaries;
}
