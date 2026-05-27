import { bootstrapDatabase } from "@/lib/bootstrap-db";
import { generateDailyReport } from "@/lib/reports";

export const maxDuration = 60;

export async function POST() {
  const bootstrap = await bootstrapDatabase();
  const report = await generateDailyReport();

  return Response.json({
    ok: true,
    bootstrap,
    report: {
      id: report.id,
      slug: report.slug,
      title: report.title,
    },
  });
}
