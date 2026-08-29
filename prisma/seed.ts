import { PrismaClient } from "@prisma/client";
import { SKILLS } from "../src/lib/resume/skillsDictionary";
import { ingestAllSources } from "../src/lib/jobs/ingest";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding skills dictionary...");
  for (const skill of SKILLS) {
    await prisma.skill.upsert({
      where: { name: skill.canonical },
      update: { category: skill.category },
      create: { name: skill.canonical, category: skill.category },
    });
  }
  console.log(`  ${SKILLS.length} skills upserted.`);

  console.log("Ingesting jobs from configured sources...");
  const summaries = await ingestAllSources();
  for (const s of summaries) {
    console.log(
      `  [${s.source}] fetched=${s.fetched} created=${s.created} updated=${s.updated} duplicates=${s.markedDuplicate} failed=${s.failed}`
    );
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
