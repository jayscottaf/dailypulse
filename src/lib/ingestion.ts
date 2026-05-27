import { and, desc, eq, gte, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { ingestionRuns, sources, videoSummaries, videos } from "@/db/schema";
import { contentHash, buildVideoSummaryInput, summarizeVideo } from "@/lib/ai";
import { logError } from "@/lib/errors";
import { fetchYoutubeRssVideos, filterNewVideos } from "@/lib/rss";
import { resolveRssUrl } from "@/lib/source-roster";
import { fetchTranscript } from "@/lib/transcripts";
import { lookupChannelIdByHandle } from "@/lib/youtube-api";

function fallbackSinceDate(lastSuccess?: Date | null) {
  if (lastSuccess) return lastSuccess;
  const since = new Date();
  since.setDate(since.getDate() - 7);
  return since;
}

export async function runIngestion() {
  const db = getDb();
  const [run] = await db.insert(ingestionRuns).values({ status: "running" }).returning();
  let videosFound = 0;
  let videosCreated = 0;
  let videosSkipped = 0;

  try {
    const [lastSuccess] = await db
      .select({ finishedAt: ingestionRuns.finishedAt })
      .from(ingestionRuns)
      .where(and(eq(ingestionRuns.status, "success"), isNull(ingestionRuns.errorMessage)))
      .orderBy(desc(ingestionRuns.finishedAt))
      .limit(1);
    const since = fallbackSinceDate(lastSuccess?.finishedAt);
    const activeSources = await db.select().from(sources).where(eq(sources.isActive, true));

    for (const source of activeSources) {
      let rssUrl = resolveRssUrl(source);
      if (!rssUrl && source.youtubeHandle) {
        const channelId = await lookupChannelIdByHandle(source.youtubeHandle);
        if (channelId) {
          rssUrl = resolveRssUrl({ ...source, youtubeChannelId: channelId });
          await db
            .update(sources)
            .set({ youtubeChannelId: channelId, rssUrl, updatedAt: new Date() })
            .where(eq(sources.id, source.id));
        }
      }
      if (!rssUrl) {
        videosSkipped += 1;
        continue;
      }

      try {
        const feedVideos = filterNewVideos(await fetchYoutubeRssVideos(rssUrl), since);
        videosFound += feedVideos.length;

        for (const feedVideo of feedVideos) {
          const transcript = await fetchTranscript(feedVideo.youtubeVideoId);
          if (transcript.status === "error") {
            await logError("transcript fetch", new Error(transcript.error), {
              youtubeVideoId: feedVideo.youtubeVideoId,
              sourceId: source.id,
            });
          }

          const inserted = await db
            .insert(videos)
            .values({
              sourceId: source.id,
              youtubeVideoId: feedVideo.youtubeVideoId,
              title: feedVideo.title,
              description: feedVideo.description,
              url: feedVideo.url,
              publishedAt: feedVideo.publishedAt,
              thumbnailUrl: feedVideo.thumbnailUrl,
              transcriptStatus: transcript.status === "available" ? "available" : transcript.status,
              transcriptText: transcript.text,
              rawMetadata: feedVideo.rawMetadata,
            })
            .onConflictDoNothing({ target: videos.youtubeVideoId })
            .returning();

          if (inserted.length > 0) {
            videosCreated += 1;
          } else {
            videosSkipped += 1;
          }
        }
      } catch (error) {
        await logError("RSS fetch", error, { sourceId: source.id, source: source.displayName, rssUrl });
      }
    }

    await summarizeUnsummarizedRecentVideos();

    await db
      .update(ingestionRuns)
      .set({
        status: "success",
        finishedAt: new Date(),
        videosFound,
        videosCreated,
        videosSkipped,
      })
      .where(eq(ingestionRuns.id, run.id));

    return { ok: true, runId: run.id, videosFound, videosCreated, videosSkipped };
  } catch (error) {
    await logError("cron execution", error, { runId: run.id });
    await db
      .update(ingestionRuns)
      .set({
        status: "error",
        finishedAt: new Date(),
        videosFound,
        videosCreated,
        videosSkipped,
        errorMessage: error instanceof Error ? error.message : String(error),
      })
      .where(eq(ingestionRuns.id, run.id));
    throw error;
  }
}

export async function summarizeUnsummarizedRecentVideos(force = false) {
  const db = getDb();
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const recentVideos = await db
    .select({ video: videos, source: sources, summary: videoSummaries })
    .from(videos)
    .innerJoin(sources, eq(videos.sourceId, sources.id))
    .leftJoin(videoSummaries, eq(videoSummaries.videoId, videos.id))
    .where(force ? gte(videos.publishedAt, since) : and(gte(videos.publishedAt, since), isNull(videoSummaries.id)));

  const summarized: string[] = [];

  for (const row of recentVideos) {
    const hash = contentHash(buildVideoSummaryInput(row.video, row.source));
    if (!force && row.summary?.contentHash === hash) continue;

    try {
      const payload = await summarizeVideo(row.video, row.source);
      await db
        .insert(videoSummaries)
        .values({
          videoId: row.video.id,
          ...payload,
          model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
          contentHash: hash,
        })
        .onConflictDoUpdate({
          target: videoSummaries.videoId,
          set: {
            ...payload,
            model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
            contentHash: hash,
            updatedAt: new Date(),
          },
        });
      summarized.push(row.video.id);
    } catch (error) {
      await logError("OpenAI generation", error, { videoId: row.video.id, title: row.video.title });
    }
  }

  return summarized;
}

export async function videosForReport(hours = 72) {
  const db = getDb();
  const since = new Date();
  since.setHours(since.getHours() - hours);

  const rows = await db
    .select({ video: videos, source: sources, summary: videoSummaries })
    .from(videos)
    .innerJoin(sources, eq(videos.sourceId, sources.id))
    .innerJoin(videoSummaries, eq(videoSummaries.videoId, videos.id))
    .where(and(gte(videos.publishedAt, since), inArray(sources.layer, ["macro_financial", "deep_tech_ai", "tesla_ownership"])))
    .orderBy(desc(videos.publishedAt));

  return rows;
}
