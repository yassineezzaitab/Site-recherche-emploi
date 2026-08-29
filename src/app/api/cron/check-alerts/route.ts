import { NextResponse } from "next/server";
import { checkAllAlerts } from "@/lib/alerts/checkAlerts";
import { jsonError } from "@/lib/apiResponse";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return jsonError("Non autorisé", 401);
  }
  const summaries = await checkAllAlerts();
  return NextResponse.json({ summaries });
}
