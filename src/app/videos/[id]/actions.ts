"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { videos } from "@/db/schema";
import { isAdminSession } from "@/lib/page-auth";

export async function saveManualTranscript(formData: FormData) {
  if (!(await isAdminSession())) throw new Error("Unauthorized.");
  const id = String(formData.get("id") ?? "");
  const transcriptText = String(formData.get("transcriptText") ?? "").trim();
  if (!id || !transcriptText) throw new Error("Missing transcript.");

  await getDb()
    .update(videos)
    .set({ transcriptText, transcriptStatus: "manual", updatedAt: new Date() })
    .where(eq(videos.id, id));

  revalidatePath(`/videos/${id}`);
}
