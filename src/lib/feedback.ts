import crypto from "node:crypto";
import { count, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { reportFeedback } from "@/db/schema";

export type FeedbackVote = "up" | "down";

export function feedbackFingerprint(input: {
  reportId: string;
  sectionTitle: string;
  subsectionTitle: string;
  itemIndex: number;
  itemText: string;
}) {
  return crypto
    .createHash("sha256")
    .update(
      [
        input.reportId,
        input.sectionTitle.trim().toLowerCase(),
        input.subsectionTitle.trim().toLowerCase(),
        input.itemIndex,
        input.itemText.trim(),
      ].join("\n"),
    )
    .digest("hex");
}

export async function feedbackForReport(reportId: string) {
  const rows = await getDb()
    .select({
      itemFingerprint: reportFeedback.itemFingerprint,
      vote: reportFeedback.vote,
    })
    .from(reportFeedback)
    .where(eq(reportFeedback.reportId, reportId));

  return new Map(rows.map((row) => [row.itemFingerprint, row.vote]));
}

function topCounts(values: string[], limit = 10) {
  const counts = new Map<string, number>();
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) continue;
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([value, votes]) => ({ value, votes }));
}

export async function buildFeedbackProfile(limit = 80) {
  const db = getDb();
  const [feedbackRows, [totalUp], [totalDown]] = await Promise.all([
    db.select().from(reportFeedback).orderBy(desc(reportFeedback.updatedAt)).limit(limit),
    db.select({ value: count() }).from(reportFeedback).where(eq(reportFeedback.vote, "up")),
    db.select({ value: count() }).from(reportFeedback).where(eq(reportFeedback.vote, "down")),
  ]);

  const liked = feedbackRows.filter((row) => row.vote === "up");
  const disliked = feedbackRows.filter((row) => row.vote === "down");
  const likedTags = liked.flatMap((row) => row.tags);
  const dislikedTags = disliked.flatMap((row) => row.tags);
  const likedSections = liked.map((row) => row.sectionTitle);
  const dislikedSections = disliked.map((row) => row.sectionTitle);

  return {
    totalVotes: feedbackRows.length,
    totalUp: totalUp?.value ?? 0,
    totalDown: totalDown?.value ?? 0,
    likedTags: topCounts(likedTags),
    dislikedTags: topCounts(dislikedTags),
    likedSections: topCounts(likedSections),
    dislikedSections: topCounts(dislikedSections),
    likedExamples: liked.slice(0, 8).map((row) => ({
      section: row.sectionTitle,
      subsection: row.subsectionTitle,
      text: row.itemText,
      tags: row.tags,
      sourceVideoIds: row.sourceVideoIds,
    })),
    dislikedExamples: disliked.slice(0, 8).map((row) => ({
      section: row.sectionTitle,
      subsection: row.subsectionTitle,
      text: row.itemText,
      tags: row.tags,
      sourceVideoIds: row.sourceVideoIds,
    })),
  };
}

export type FeedbackProfile = Awaited<ReturnType<typeof buildFeedbackProfile>>;
