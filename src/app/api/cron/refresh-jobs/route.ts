import { NextResponse } from "next/server";
import { ingestAllSources } from "@/lib/jobs/ingest";
import { jsonError } from "@/lib/apiResponse";

/**
 * Triggers a job-source refresh over HTTP, for hosted schedulers (Vercel
 * Cron, a GitHub Action, etc.) that can't invoke `npm run refresh:jobs`
 * directly. Protected by a shared secret so only your own scheduler can
 * call it — never expose this URL publicly.
 */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return jsonError("Non autorisé", 401);
  }
  const summaries = await ingestAllSources();
  return NextResponse.json({ summaries });
}
