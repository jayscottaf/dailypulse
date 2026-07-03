import { count, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { dailyReports, errorLogs, ingestionRuns, sources, videos } from "@/db/schema";

export async function adminStats() {
  const db = getDb();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Scope "Recent errors" to the last 7 days so resolved, weeks-old errors don't
  // sit on the dashboard indefinitely looking like an active problem.
  const errorWindowStart = new Date();
  errorWindowStart.setDate(errorWindowStart.getDate() - 7);

  const [[lastRun], [lastReport], [sourceCount], [videosToday], [reportsCount], transcriptCounts, recentErrors] =
    await Promise.all([
      db.select().from(ingestionRuns).orderBy(desc(ingestionRuns.startedAt)).limit(1),
      db.select().from(dailyReports).orderBy(desc(dailyReports.generatedAt)).limit(1),
      db.select({ value: count() }).from(sources),
      db.select({ value: count() }).from(videos).where(gte(videos.createdAt, today)),
      db.select({ value: count() }).from(dailyReports),
      db
        .select({ status: videos.transcriptStatus, value: count() })
        .from(videos)
        .groupBy(videos.transcriptStatus),
      db
        .select()
        .from(errorLogs)
        .where(gte(errorLogs.createdAt, errorWindowStart))
        .orderBy(desc(errorLogs.createdAt))
        .limit(8),
    ]);

  return {
    lastRun,
    lastReport,
    sourceCount: sourceCount?.value ?? 0,
    videosToday: videosToday?.value ?? 0,
    reportsCount: reportsCount?.value ?? 0,
    transcriptCounts,
    recentErrors,
  };
}

export async function listReports() {
  return getDb().select().from(dailyReports).orderBy(desc(dailyReports.date));
}

export async function listSources() {
  return getDb().select().from(sources).orderBy(sources.layer, sources.displayName);
}

export async function latestVideos(limit = 30) {
  return getDb()
    .select({ video: videos, source: sources })
    .from(videos)
    .innerJoin(sources, eq(videos.sourceId, sources.id))
    .orderBy(desc(videos.publishedAt))
    .limit(limit);
}

export async function rebuildSearchIndex() {
  await getDb().execute(sql`ANALYZE videos`);
  await getDb().execute(sql`ANALYZE daily_reports`);
  await getDb().execute(sql`ANALYZE video_summaries`);
  return { ok: true };
}
