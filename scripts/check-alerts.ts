import { checkAllAlerts } from "../src/lib/alerts/checkAlerts";
import { prisma } from "../src/lib/prisma";

async function main() {
  const summaries = await checkAllAlerts();
  const totalNotifications = summaries.reduce((s, x) => s + x.newNotifications, 0);
  console.log(`Checked ${summaries.length} alerts, created ${totalNotifications} notifications.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
