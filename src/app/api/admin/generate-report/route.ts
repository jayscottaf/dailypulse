import { requireAdminSecret } from "@/lib/auth";
import { generateDailyReport } from "@/lib/reports";

export async function POST(request: Request) {
  const unauthorized = requireAdminSecret(request);
  if (unauthorized) return unauthorized;

  const report = await generateDailyReport();
  return Response.json({ ok: true, reportId: report.id, slug: report.slug });
}
