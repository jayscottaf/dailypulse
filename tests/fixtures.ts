import type { DailyReport, Source, Video, VideoSummary } from "../src/db/schema";
import { summaryHash } from "../src/lib/evidence";

export const source: Source = { id: "10000000-0000-4000-8000-000000000001", displayName: "Test Creator", layer: "deep_tech_ai", youtubeChannelId: null, youtubeHandle: null, rssUrl: null, focusDescription: "Unrelated military and banking claims", isActive: true, createdAt: new Date(), updatedAt: new Date() };
export function video(overrides: Partial<Video> = {}): Video {
  return { id: "20000000-0000-4000-8000-000000000001", sourceId: source.id, youtubeVideoId: "testVideo01", title: "A useful AI tool", description: "Promotional text is not a transcript", url: "https://www.youtube.com/watch?v=testVideo01", publishedAt: new Date("2026-09-17T10:00:00Z"), thumbnailUrl: null, transcriptStatus: "available", transcriptText: "The speaker says this may help with drafting, but the results are preliminary.", rawMetadata: {}, createdAt: new Date(), updatedAt: new Date(), ...overrides };
}
export function summary(v = video(), overrides: Partial<VideoSummary> = {}): VideoSummary {
  return { id: "30000000-0000-4000-8000-000000000001", videoId: v.id, conciseSummary: "The creator says the tool may help draft documents; results are preliminary.", keyClaims: ["The results may be useful."], importantDataPoints: [], quotesOrParaphrases: [], tags: ["AI"], relevanceScoreForJason: 80, actionSignals: [], model: "test", contentHash: summaryHash(v, source), createdAt: new Date(), updatedAt: new Date(), ...overrides };
}
export function report(overrides: Partial<DailyReport> = {}): DailyReport {
  return { id: "40000000-0000-4000-8000-000000000001", date: "2026-09-17", title: "Daily Pulse", slug: "daily-pulse-2026-09-17", summaryPreview: "Preview", fullMarkdown: "", structuredJson: {}, sourceVideoIds: [], tags: [], generatedAt: new Date(), emailSentAt: null, createdAt: new Date(), updatedAt: new Date(), ...overrides };
}
