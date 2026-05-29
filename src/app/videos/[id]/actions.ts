"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { videos } from "@/db/schema";
import { isAdminSession } from "@/lib/page-auth";
import { runAction, type ActionResult } from "@/lib/action-result";

export async function saveManualTranscript(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction("Save transcript", async () => {
    if (!(await isAdminSession())) throw new Error("Unauthorized.");
    const id = String(formData.get("id") ?? "");
    const transcriptText = String(formData.get("transcriptText") ?? "").trim();
    if (!id) throw new Error("Missing video id.");
    if (!transcriptText) throw new Error("Transcript text is empty.");

    await getDb()
      .update(videos)
      .set({ transcriptText, transcriptStatus: "manual", updatedAt: new Date() })
      .where(eq(videos.id, id));

    revalidatePath(`/videos/${id}`);
    return "Transcript saved (status: manual).";
  });
}
