import { validateCronSecret } from "@/lib/auth";
import { sendReportEmail } from "@/lib/email";
import { generateDailyReport } from "@/lib/reports";

export const maxDuration = 60;

// Summarize a bounded, publisher-balanced selection, then build and deliver
// the briefing after the separate feed collection job finishes.
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
