import { desc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { dailyReports } from "@/db/schema";
import { requireAdminSecret } from "@/lib/auth";
import { sendReportEmail } from "@/lib/email";

export const maxDuration = 60;

export async function POST(request: Request) {
  const unauthorized = requireAdminSecret(request);
  if (unauthorized) return unauthorized;

  const body = (await request.json().catch(() => ({}))) as { reportId?: string; force?: boolean };
  let reportId = body.reportId;
  if (!reportId) {
    const [latest] = await getDb().select().from(dailyReports).orderBy(desc(dailyReports.generatedAt)).limit(1);
    reportId = latest?.id;
  }
  if (!reportId) return Response.json({ ok: false, error: "No report available." }, { status: 404 });

  const result = await sendReportEmail(reportId, Boolean(body.force));
  return Response.json({ ok: true, ...result });
}
