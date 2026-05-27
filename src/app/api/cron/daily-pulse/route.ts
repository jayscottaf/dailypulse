import { validateCronSecret } from "@/lib/auth";
import { sendReportEmail } from "@/lib/email";
import { runIngestion } from "@/lib/ingestion";
import { generateDailyReport } from "@/lib/reports";

export async function GET(request: Request) {
  if (!validateCronSecret(request.headers.get("authorization"))) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const ingestion = await runIngestion();
  const report = await generateDailyReport();
  const email = await sendReportEmail(report.id);

  return Response.json({
    ok: true,
    ingestion,
    report: { id: report.id, slug: report.slug },
    email,
  });
}
