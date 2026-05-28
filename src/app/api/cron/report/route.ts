import { validateCronSecret } from "@/lib/auth";
import { sendReportEmail } from "@/lib/email";
import { generateDailyReport } from "@/lib/reports";

export const maxDuration = 60;

// Second half of the split daily-pulse cron (see ./ingest/route.ts). Runs a few
// minutes after ingestion so today's videos are already summarized, then builds
// the report and emails it — keeping this invocation well under the 60s Hobby
// limit that the original combined cron blew past.
export async function GET(request: Request) {
  if (!validateCronSecret(request.headers.get("authorization"))) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const report = await generateDailyReport();
  const email = await sendReportEmail(report.id);

  return Response.json({
    ok: true,
    report: { id: report.id, slug: report.slug },
    email,
  });
}
