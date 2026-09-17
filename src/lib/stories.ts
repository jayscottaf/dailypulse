import { z } from "zod";

import { topicKeys } from "@/lib/topics";
export { TOPICS } from "@/lib/topics";
export const storySchema = z.object({
  id: z.string(),
  headline: z.string(),
  summary: z.string(),
  details: z.array(z.string()),
  topic: z.enum(topicKeys),
  kind: z.enum(["video", "article", "forum"]).optional(),
  evidence: z.enum(["transcript", "article", "forum", "metadata"]),
  novelty: z.enum(["new", "updated", "seen"]),
  score: z.number(),
  contentHash: z.string(),
  sources: z.array(z.object({ kind: z.enum(["video", "article", "forum"]).optional(), id: z.string(), channelId: z.string().optional(), name: z.string(), url: z.string().url(), publishedAt: z.string(), thumbnailUrl: z.string().nullable(), contentHash: z.string() })).min(1),
});
export type Story = z.infer<typeof storySchema>;
export const briefingSchema = z.object({
  version: z.literal(2),
  status: z.enum(["ready", "quiet", "limited", "source_error"]),
  stories: z.array(storySchema),
  briefStoryIds: z.array(z.string()).max(5),
  message: z.string(),
});
export type Briefing = z.infer<typeof briefingSchema>;

export function parseBriefing(value: unknown): Briefing | null {
  const parsed = briefingSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function briefStories(briefing: Briefing) {
  return briefing.briefStoryIds.flatMap(id => {
    const story = briefing.stories.find(item => item.id === id);
    return story && story.evidence !== "metadata" && story.novelty !== "seen" ? [story] : [];
  });
}

export function safeSourceUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch { return null; }
}
