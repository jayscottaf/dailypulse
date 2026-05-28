"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { dailyReports, reportFeedback } from "@/db/schema";
import { feedbackFingerprint, type FeedbackVote } from "@/lib/feedback";
import { isAdminSession } from "@/lib/page-auth";

async function assertAdmin() {
  if (!(await isAdminSession())) throw new Error("Unauthorized.");
}

export type FeedbackActionState = {
  selectedVote?: FeedbackVote;
  status: "idle" | "saved" | "unchanged" | "error";
  message?: string;
  savedAt?: string;
};

function parseStringArray(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map((item) => String(item)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export async function saveReportFeedback(
  _prevState: FeedbackActionState,
  formData: FormData,
): Promise<FeedbackActionState> {
  try {
    await assertAdmin();

    const reportId = String(formData.get("reportId") ?? "");
    const vote = String(formData.get("vote") ?? "") as FeedbackVote;
    const itemText = String(formData.get("itemText") ?? "").trim();
    const sectionTitle = String(formData.get("sectionTitle") ?? "").trim();
    const subsectionTitle = String(formData.get("subsectionTitle") ?? "").trim();
    const itemIndex = Number(formData.get("itemIndex") ?? 0);
    const sourceVideoIds = parseStringArray(formData.get("sourceVideoIds"));
    const tags = parseStringArray(formData.get("tags"));

    if (!reportId || !itemText || !sectionTitle || !subsectionTitle || !["up", "down"].includes(vote)) {
      throw new Error("Invalid feedback payload.");
    }

    const [report] = await getDb()
      .select({ slug: dailyReports.slug })
      .from(dailyReports)
      .where(eq(dailyReports.id, reportId))
      .limit(1);
    if (!report) throw new Error("Report not found.");

    const itemFingerprint = feedbackFingerprint({
      reportId,
      sectionTitle,
      subsectionTitle,
      itemIndex,
      itemText,
    });

    const [existing] = await getDb()
      .select({ vote: reportFeedback.vote })
      .from(reportFeedback)
      .where(and(eq(reportFeedback.reportId, reportId), eq(reportFeedback.itemFingerprint, itemFingerprint)))
      .limit(1);

    if (existing?.vote === vote) {
      return {
        selectedVote: vote,
        status: "unchanged",
        message: "Already saved",
        savedAt: new Date().toISOString(),
      };
    }

    await getDb()
      .insert(reportFeedback)
      .values({
        reportId,
        itemFingerprint,
        vote,
        itemText,
        sectionTitle,
        subsectionTitle,
        sourceVideoIds,
        tags,
        metadata: { itemIndex },
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [reportFeedback.reportId, reportFeedback.itemFingerprint],
        set: {
          vote,
          itemText,
          sectionTitle,
          subsectionTitle,
          sourceVideoIds,
          tags,
          metadata: { itemIndex },
          updatedAt: new Date(),
        },
      });

    revalidatePath(`/daily-pulse/${report.slug}`);
    revalidatePath("/liked");

    return {
      selectedVote: vote,
      status: "saved",
      message: "Saved",
      savedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to save feedback.",
    };
  }
}
