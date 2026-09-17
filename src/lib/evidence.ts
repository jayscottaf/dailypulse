import { contentKind } from "@/lib/content-kind";
import crypto from "node:crypto";
import type { Source, Video, VideoSummary } from "@/db/schema";

export const SUMMARY_POLICY = "source-evidence-v2";

export function hasTranscript(video: Pick<Video, "transcriptText" | "transcriptStatus">) {
  return ["available", "manual"].includes(video.transcriptStatus) && Boolean(video.transcriptText?.trim());
}

export function writtenEvidence(video: Video) {
  return contentKind(video) !== "video" && typeof video.rawMetadata.bodyText === "string" && video.rawMetadata.bodyText.trim().length >= 200 ? video.rawMetadata.bodyText.trim().slice(0,35000) : "";
}
export function hasSourceText(video: Video) { return contentKind(video) === "video" ? hasTranscript(video) : Boolean(writtenEvidence(video)); }

export function summaryInput(video: Video, source: Source) {
  if (contentKind(video) !== "video") return [`Policy: written-evidence-v1`, `Source: ${source.displayName}`, `Title (context, not evidence): ${video.title}`, `Published: ${video.publishedAt.toISOString()}`, `Evidence: ${contentKind(video) === "forum" ? "Individual forum post, not verified reporting or community consensus" : "Publisher article excerpt; may be incomplete"}`, writtenEvidence(video) || "Text unavailable"].join("\n\n");
  return [
    `Policy: ${SUMMARY_POLICY}`,
    `Source: ${source.displayName}`,
    `Video title (context, not evidence): ${video.title}`,
    `Published: ${video.publishedAt.toISOString()}`,
    `Evidence basis: ${hasTranscript(video) ? video.transcriptStatus : "metadata only"}`,
    `Transcript excerpt (may be incomplete):\n${hasTranscript(video) ? video.transcriptText!.trim().slice(0, 35000) : "Unavailable"}`,
  ].join("\n\n");
}

export function summaryHash(video: Video, source: Source) {
  return crypto.createHash("sha256").update(summaryInput(video, source)).digest("hex");
}

export function metadataPreview(video: Video, source: Source) {
  const isWritten = contentKind(video) !== "video";
  return {
    conciseSummary: `${source.displayName.split("/")[0].trim()} published “${video.title}”. ${isWritten ? (writtenEvidence(video) ? "A summary of the source text is not ready yet." : "The source text is unavailable; this is a title-only preview.") : hasTranscript(video) ? "A summary of the transcript is not ready yet." : "The transcript is unavailable; this is a title-only preview."}`,
    keyClaims: [] as string[],
    importantDataPoints: [] as string[],
    quotesOrParaphrases: [] as string[],
    tags: [] as string[],
    relevanceScoreForJason: 0,
    actionSignals: [] as string[],
  };
}

// Old or metadata-only generations must never be promoted to factual summaries.
export function sourceEvidence(video: Video, source: Source, summary: VideoSummary | null) {
  const grounded = hasSourceText(video) && summary?.contentHash === summaryHash(video, source);
  return {
    basis: grounded ? (contentKind(video) === "video" ? "transcript" as const : contentKind(video) === "forum" ? "forum" as const : "article" as const) : "metadata" as const,
    label: grounded ? (contentKind(video) !== "video" ? (contentKind(video) === "forum" ? "Forum post summary" : "Article excerpt summary") : video.transcriptStatus === "manual" ? "Manual transcript" : "Transcript summary") : "Title only",
    summary: grounded ? summary! : metadataPreview(video, source),
  };
}
