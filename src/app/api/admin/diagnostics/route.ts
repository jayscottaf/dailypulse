import { count, desc, isNull } from "drizzle-orm";
import { requireAdminSecret } from "@/lib/auth";
import { getDb } from "@/db/client";
import { errorLogs, ingestionRuns, reportFeedback, sources, videoSummaries, videos } from "@/db/schema";

export const maxDuration = 30;

export async function GET(request: Request) {
  const unauthorized = requireAdminSecret(request);
  if (unauthorized) return unauthorized;

  const db = getDb();
  const [
    [sourceCount],
    [missingChannelIds],
    [videoCount],
    [summaryCount],
    [feedbackCount],
    sourceRows,
    recentVideos,
    recentRuns,
    recentErrors,
  ] = await Promise.all([
    db.select({ value: count() }).from(sources),
    db.select({ value: count() }).from(sources).where(isNull(sources.youtubeChannelId)),
    db.select({ value: count() }).from(videos),
    db.select({ value: count() }).from(videoSummaries),
    db.select({ value: count() }).from(reportFeedback),
    db
      .select({
        displayName: sources.displayName,
        layer: sources.layer,
        youtubeHandle: sources.youtubeHandle,
        youtubeChannelId: sources.youtubeChannelId,
        rssUrl: sources.rssUrl,
        isActive: sources.isActive,
      })
      .from(sources)
      .orderBy(sources.layer, sources.displayName),
    db
      .select({
        title: videos.title,
        youtubeVideoId: videos.youtubeVideoId,
        publishedAt: videos.publishedAt,
        transcriptStatus: videos.transcriptStatus,
      })
      .from(videos)
      .orderBy(desc(videos.publishedAt))
      .limit(10),
    db.select().from(ingestionRuns).orderBy(desc(ingestionRuns.startedAt)).limit(5),
    db.select().from(errorLogs).orderBy(desc(errorLogs.createdAt)).limit(10),
  ]);

  return Response.json({
    ok: true,
    counts: {
      sources: sourceCount?.value ?? 0,
      missingChannelIds: missingChannelIds?.value ?? 0,
      videos: videoCount?.value ?? 0,
      videoSummaries: summaryCount?.value ?? 0,
      reportFeedback: feedbackCount?.value ?? 0,
    },
    sources: sourceRows,
    recentVideos,
    recentRuns,
    recentErrors,
  });
}
