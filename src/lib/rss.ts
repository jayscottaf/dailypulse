import Parser from "rss-parser";
import { z } from "zod";

const parser = new Parser({
  customFields: {
    item: [
      ["media:group", "mediaGroup"],
      ["yt:videoId", "youtubeVideoId"],
    ],
  },
});

export const rssVideoSchema = z.object({
  youtubeVideoId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  url: z.string(),
  publishedAt: z.date(),
  thumbnailUrl: z.string().nullable(),
  rawMetadata: z.record(z.string(), z.unknown()),
});

export type RssVideo = z.infer<typeof rssVideoSchema>;

function extractThumbnail(item: Record<string, unknown>) {
  const mediaGroup = item.mediaGroup as { "media:thumbnail"?: Array<{ $?: { url?: string } }> } | undefined;
  return mediaGroup?.["media:thumbnail"]?.[0]?.$?.url ?? null;
}

export async function fetchYoutubeRssVideos(rssUrl: string): Promise<RssVideo[]> {
  const feed = await parser.parseURL(rssUrl);

  return feed.items
    .map((item) => {
      const raw = item as unknown as Record<string, unknown>;
      const youtubeVideoId =
        String(raw.youtubeVideoId || raw.id || "").replace("yt:video:", "") ||
        new URL(String(item.link)).searchParams.get("v") ||
        "";
      const publishedAt = item.isoDate ? new Date(item.isoDate) : new Date(item.pubDate ?? Date.now());

      return rssVideoSchema.parse({
        youtubeVideoId,
        title: item.title ?? "Untitled video",
        description: item.contentSnippet ?? item.content ?? null,
        url: item.link ?? `https://www.youtube.com/watch?v=${youtubeVideoId}`,
        publishedAt,
        thumbnailUrl: extractThumbnail(raw),
        rawMetadata: raw,
      });
    })
    .filter((item) => item.youtubeVideoId);
}

export function filterNewVideos<T extends { publishedAt: Date }>(videos: T[], since: Date) {
  return videos.filter((video) => video.publishedAt >= since);
}
