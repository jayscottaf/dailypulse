import { readerContext } from "@/lib/reader-store";
import type { ReaderContext } from "@/lib/reader-preferences";
import { desc, eq, gte, lt } from "drizzle-orm";
import { getDb } from "@/db/client";
import { dailyReports, reportVideos, sources, videoSummaries, videos, type DailyReport } from "@/db/schema";
import { buildBriefing, priorCoverage } from "@/lib/briefing";
import { parseBriefing } from "@/lib/stories";

export async function readingReport(report: DailyReport) {
  const saved = parseBriefing(report.structuredJson);
  const rows = await getDb().select({ video: videos, source: sources, summary: videoSummaries }).from(reportVideos)
    .innerJoin(videos, eq(reportVideos.videoId, videos.id)).innerJoin(sources, eq(videos.sourceId, sources.id))
    .leftJoin(videoSummaries, eq(videoSummaries.videoId, videos.id)).where(eq(reportVideos.reportId, report.id));
  const channels = new Map(rows.map(row => [row.video.id, row.source.id]));
  return saved ? { ...saved, stories: saved.stories.map(story => ({ ...story, sources: story.sources.map(source => ({ ...source, channelId: channels.get(source.id) })) })) } : buildBriefing(rows);
}

export async function readingFeed() {
  const db = getDb();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [rows, reports, reader] = await Promise.all([
    db.select({ video: videos, source: sources, summary: videoSummaries }).from(videos).innerJoin(sources, eq(videos.sourceId, sources.id))
      .leftJoin(videoSummaries, eq(videoSummaries.videoId, videos.id)).where(gte(videos.publishedAt, since)).orderBy(desc(videos.publishedAt)).limit(150),
    db.select().from(dailyReports).where(lt(dailyReports.date, new Date().toISOString().slice(0, 10))).orderBy(desc(dailyReports.date)).limit(14),
    readerContext(),
  ]);
  return buildBriefing(rows.filter(row => row.source.isActive), priorCoverage(reports), false, undefined, reader);
}

export function filterReadingReport(briefing: ReturnType<typeof buildBriefing>, reader: ReaderContext) {
  const stories = briefing.stories.filter(story => reader.preferences.topics.includes(story.topic) && !story.sources.some(source => source.channelId && reader.preferences.mutedSourceIds.includes(source.channelId)));
  const briefStoryIds = briefing.briefStoryIds.filter(id => stories.some(story => story.id === id)).slice(0, reader.preferences.briefLength);
  const message = briefing.status === "ready" ? (briefStoryIds.length ? `${briefStoryIds.length} new or updated ${briefStoryIds.length === 1 ? "story" : "stories"} worth a look.` : "No briefing stories match your current preferences.") : briefing.message;
  return { ...briefing, stories, briefStoryIds, message };
}
