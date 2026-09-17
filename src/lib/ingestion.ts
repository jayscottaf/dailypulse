import { fetchArticleFeed, enrichArticle } from "@/lib/article-feeds";
import { sourceKind } from "@/lib/content-kind";
import { hasSourceText } from "@/lib/evidence";
import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { getDb } from "@/db/client";
import { ingestionRuns, sources, videoSummaries, videos } from "@/db/schema";
import { summarizeVideo } from "@/lib/ai";
import { summaryHash } from "@/lib/evidence";
import { logError } from "@/lib/errors";
import { fetchYoutubeRssVideos, filterNewVideos } from "@/lib/rss";
import { resolveRssUrl } from "@/lib/source-roster";
import { fetchTranscript } from "@/lib/transcripts";
import { lookupChannelIdByHandle } from "@/lib/youtube-api";

type IngestionOptions = {
  summarize?: boolean;
  summaryLimit?: number;
};

export async function runIngestion({ summarize = false, summaryLimit = 4 }: IngestionOptions = {}) {
  const db = getDb();
  const [run] = await db.insert(ingestionRuns).values({ status: "running" }).returning();
  let videosFound = 0;
  let videosCreated = 0;
  let videosSkipped = 0;
  const failedSourceIds = new Set<string>();

  try {
    // Revisit a bounded window so a failed source does not lose its updates
    // when other sources succeed. Existing IDs are skipped before transcript work.
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeSources = await db.select().from(sources).where(eq(sources.isActive, true));

    for (let offset = 0; offset < activeSources.length; offset += 8) {
    await Promise.all(activeSources.slice(offset, offset + 8).map(async source => {
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
        failedSourceIds.add(source.id);
        videosSkipped += 1;
        return;
      }

      try {
        const feedVideos = filterNewVideos(sourceKind(source) === "video" ? await fetchYoutubeRssVideos(rssUrl) : await fetchArticleFeed(source), since).slice(0, 10);
        videosFound += feedVideos.length;

        const existing = feedVideos.length ? await db.select({ id: videos.youtubeVideoId }).from(videos).where(inArray(videos.youtubeVideoId, feedVideos.map(video => video.youtubeVideoId))) : [];
        const knownIds = new Set(existing.map(video => video.id));
        for (const feedVideo of feedVideos) {
          if (knownIds.has(feedVideo.youtubeVideoId)) { videosSkipped += 1; continue; }
          if (sourceKind(source) !== "video") {
            const item = feedVideo;
            const inserted = await db.insert(videos).values({ ...item, sourceId: source.id }).onConflictDoNothing({target:videos.youtubeVideoId}).returning();
            if(inserted.length) videosCreated += 1; else videosSkipped += 1;
            continue;
          }
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
        failedSourceIds.add(source.id);
        await logError("RSS fetch", error, { sourceId: source.id, source: source.displayName, rssUrl });
      }
    }));
    }

    if (summarize) {
      await summarizeUnsummarizedRecentVideos(false, summaryLimit);
    }

    await db
      .update(ingestionRuns)
      .set({
        status: failedSourceIds.size ? "partial" : "success",
        errorMessage: failedSourceIds.size ? `${failedSourceIds.size} source checks failed.` : null,
        metadata: { activeSources: activeSources.length, failedSourceIds: [...failedSourceIds] },
        finishedAt: new Date(),
        videosFound,
        videosCreated,
        videosSkipped,
      })
      .where(eq(ingestionRuns.id, run.id));

    return { ok: failedSourceIds.size === 0, runId: run.id, videosFound, videosCreated, videosSkipped, failedSources: failedSourceIds.size };
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

export async function summarizeUnsummarizedRecentVideos(force = false, limit = 8) {
  const db = getDb();
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const recentVideos = await db
    .select({ video: videos, source: sources, summary: videoSummaries })
    .from(videos)
    .innerJoin(sources, eq(videos.sourceId, sources.id))
    .leftJoin(videoSummaries, eq(videoSummaries.videoId, videos.id))
    .where(and(eq(sources.isActive, true), gte(videos.publishedAt, since)))
    .orderBy(desc(videos.publishedAt))
    .limit(500);

  // Reserve a place for each publisher before taking additional stories from
  // the same feed. A prolific publisher must not consume the entire AI budget.
  const pending = recentVideos.filter(row => force || row.summary?.contentHash !== summaryHash(row.video, row.source));
  pending.sort((a, b) => Number(hasSourceText(b.video) || sourceKind(b.source) === "article") - Number(hasSourceText(a.video) || sourceKind(a.source) === "article"));
  const seen = new Set<string>();
  const first = pending.filter(row => {
    if (seen.has(row.source.id)) return false;
    seen.add(row.source.id); return true;
  });
  const candidates = [...first, ...pending.filter(row => !first.includes(row))].slice(0, Math.min(limit, 8));
  const summarized: string[] = [];
  await Promise.all(candidates.map(async row => {
    try {
      if (sourceKind(row.source) === "article") {
        const enriched = await enrichArticle(row.video as unknown as Awaited<ReturnType<typeof fetchArticleFeed>>[number]);
        if (enriched.rawMetadata.bodyText !== row.video.rawMetadata.bodyText) {
          const [updated] = await db.update(videos).set({ rawMetadata: enriched.rawMetadata, description: enriched.description, updatedAt: new Date() }).where(eq(videos.id, row.video.id)).returning();
          row.video = updated;
        }
      }
      const hash = summaryHash(row.video, row.source);
      const payload = await summarizeVideo(row.video, row.source);
      await db.insert(videoSummaries).values({
        videoId: row.video.id, ...payload,
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini", contentHash: hash,
      }).onConflictDoUpdate({ target: videoSummaries.videoId, set: {
        ...payload, model: process.env.OPENAI_MODEL || "gpt-4.1-mini", contentHash: hash, updatedAt: new Date(),
      }});
      summarized.push(row.video.id);
    } catch (error) {
      await logError("OpenAI generation", error, { videoId: row.video.id, title: row.video.title });
    }
  }));

  return summarized;
}

export async function videosForReport(hours = 72, reportDate?: string) {
  const db = getDb();
  const until = reportDate ? new Date(Math.min(Date.now(), new Date(`${reportDate}T23:59:59.999Z`).getTime())) : new Date();
  const since = new Date(until.getTime() - hours * 60 * 60 * 1000);

  const rows = await db
    .select({ video: videos, source: sources, summary: videoSummaries })
    .from(videos)
    .innerJoin(sources, eq(videos.sourceId, sources.id))
    .leftJoin(videoSummaries, eq(videoSummaries.videoId, videos.id))
    .where(and(eq(sources.isActive, true), gte(videos.publishedAt, since), lte(videos.publishedAt, until)))
    .orderBy(desc(videos.publishedAt));

  return rows;
}
