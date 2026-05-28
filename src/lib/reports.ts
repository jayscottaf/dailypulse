import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { dailyReports, reportVideos, videos } from "@/db/schema";
import { generateDailyReportMarkdown } from "@/lib/ai";
import { logError } from "@/lib/errors";
import { buildFeedbackProfile } from "@/lib/feedback";
import { videosForReport } from "@/lib/ingestion";
import { createReportSlug, todayIso } from "@/lib/slug";

export async function generateDailyReport(reportDate = todayIso()) {
  const db = getDb();
  const reportInput = await videosForReport(72);
  const feedbackProfile = await buildFeedbackProfile();

  try {
    const generated = await generateDailyReportMarkdown(reportDate, reportInput, feedbackProfile);
    const slug = createReportSlug(reportDate);
    const sourceVideoIds = reportInput.map((row) => row.video.id);

    const [report] = await db
      .insert(dailyReports)
      .values({
        date: reportDate,
        title: generated.title,
        slug,
        summaryPreview: generated.summaryPreview,
        fullMarkdown: generated.fullMarkdown,
        structuredJson: generated.structuredJson,
        sourceVideoIds,
        tags: generated.tags,
      })
      .onConflictDoUpdate({
        target: dailyReports.slug,
        set: {
          title: generated.title,
          summaryPreview: generated.summaryPreview,
          fullMarkdown: generated.fullMarkdown,
          structuredJson: generated.structuredJson,
          sourceVideoIds,
          tags: generated.tags,
          generatedAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .returning();

    await db.delete(reportVideos).where(eq(reportVideos.reportId, report.id));
    if (sourceVideoIds.length > 0) {
      await db.insert(reportVideos).values(
        sourceVideoIds.map((videoId) => ({
          reportId: report.id,
          videoId,
        })),
      );
    }

    return report;
  } catch (error) {
    await logError("OpenAI generation", error, { reportDate, videoCount: reportInput.length });
    throw error;
  }
}

export async function latestReport() {
  const [report] = await getDb().select().from(dailyReports).orderBy(desc(dailyReports.generatedAt)).limit(1);
  return report ?? null;
}

export async function reportSources(reportId: string) {
  const rows = await getDb()
    .select()
    .from(reportVideos)
    .innerJoin(videos, eq(reportVideos.videoId, videos.id))
    .where(eq(reportVideos.reportId, reportId));
  return rows.map((row) => row.videos);
}
