import type { Source, Video } from "@/db/schema";
export function sourceKind(source: Pick<Source, "rssUrl" | "youtubeChannelId" | "youtubeHandle">): "video" | "article" | "forum" {
  if (!source.rssUrl) return "video";
  try {
    const url = new URL(source.rssUrl);
    if (/(^|\.)youtube\.com$/.test(url.hostname)) return "video";
    return /^(news\.ycombinator\.com|(?:www\.)?teslamotorsclub\.com)$/.test(url.hostname) || /\/forums?\//.test(url.pathname) ? "forum" : "article";
  } catch { return "article"; }
}
export function contentKind(video: Pick<Video, "rawMetadata">): "video" | "article" | "forum" {
  return video.rawMetadata.contentKind === "article" ? "article" : video.rawMetadata.contentKind === "forum" ? "forum" : "video";
}
export const EVIDENCE_LABELS = { transcript: "From transcript", article: "From article excerpt", forum: "From forum post", metadata: "Title-only preview" } as const;
