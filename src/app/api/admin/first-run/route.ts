import { bootstrapDatabase } from "@/lib/bootstrap-db";
import { runIngestion } from "@/lib/ingestion";
import { generateDailyReport } from "@/lib/reports";

export const maxDuration = 60;

export async function POST() {
  const bootstrap = await bootstrapDatabase();
  const ingestion = await runIngestion();
  const report = await generateDailyReport();

  return Response.json({
    ok: true,
    bootstrap,
    ingestion,
    report: {
      id: report.id,
      slug: report.slug,
      title: report.title,
    },
  });
}
