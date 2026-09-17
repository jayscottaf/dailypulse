import { desc, eq, gte, lt } from "drizzle-orm";
import { getDb } from "@/db/client";
import { dailyReports, reportVideos, sources, videoSummaries, videos, type DailyReport } from "@/db/schema";
import { buildBriefing, priorCoverage } from "@/lib/briefing";
import { parseBriefing } from "@/lib/stories";

export async function readingReport(report: DailyReport) {
  const saved = parseBriefing(report.structuredJson);
  if (saved) return saved;
  const rows = await getDb().select({ video: videos, source: sources, summary: videoSummaries }).from(reportVideos)
    .innerJoin(videos, eq(reportVideos.videoId, videos.id)).innerJoin(sources, eq(videos.sourceId, sources.id))
    .leftJoin(videoSummaries, eq(videoSummaries.videoId, videos.id)).where(eq(reportVideos.reportId, report.id));
  return buildBriefing(rows);
}

export async function readingFeed() {
  const db = getDb();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [rows, reports] = await Promise.all([
    db.select({ video: videos, source: sources, summary: videoSummaries }).from(videos).innerJoin(sources, eq(videos.sourceId, sources.id))
      .leftJoin(videoSummaries, eq(videoSummaries.videoId, videos.id)).where(gte(videos.publishedAt, since)).orderBy(desc(videos.publishedAt)).limit(150),
    db.select().from(dailyReports).where(lt(dailyReports.date, new Date().toISOString().slice(0, 10))).orderBy(desc(dailyReports.date)).limit(14),
  ]);
  return buildBriefing(rows.filter(row => row.source.isActive), priorCoverage(reports));
}
