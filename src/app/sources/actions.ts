"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sources } from "@/db/schema";
import { isAdminSession } from "@/lib/page-auth";
import { resolveRssUrl } from "@/lib/source-roster";

async function assertAdmin() {
  if (!(await isAdminSession())) throw new Error("Unauthorized.");
}

export async function saveSource(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const youtubeChannelId = String(formData.get("youtubeChannelId") ?? "").trim() || null;
  const rssUrl = String(formData.get("rssUrl") ?? "").trim() || null;
  const values = {
    displayName: String(formData.get("displayName") ?? "").trim(),
    layer: String(formData.get("layer") ?? "macro_financial") as "macro_financial" | "deep_tech_ai" | "tesla_ownership",
    youtubeChannelId,
    youtubeHandle: String(formData.get("youtubeHandle") ?? "").trim() || null,
    rssUrl: rssUrl || resolveRssUrl({ youtubeChannelId, rssUrl }),
    focusDescription: String(formData.get("focusDescription") ?? "").trim(),
    isActive: formData.get("isActive") === "on",
    updatedAt: new Date(),
  };

  if (id) {
    await getDb().update(sources).set(values).where(eq(sources.id, id));
  } else {
    await getDb().insert(sources).values(values);
  }

  revalidatePath("/sources");
  revalidatePath("/admin");
}
