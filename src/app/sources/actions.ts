"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sources } from "@/db/schema";
import { isAdminSession } from "@/lib/page-auth";
import { resolveRssUrl } from "@/lib/source-roster";
import { runAction, type ActionResult } from "@/lib/action-result";

async function assertAdmin() {
  if (!(await isAdminSession())) throw new Error("Unauthorized.");
}

export async function saveSource(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction("Save source", async () => {
    await assertAdmin();

    const id = String(formData.get("id") ?? "");
    const displayName = String(formData.get("displayName") ?? "").trim();
    const focusDescription = String(formData.get("focusDescription") ?? "").trim();
    if (!displayName) throw new Error("Display name is required.");
    if (!focusDescription) throw new Error("Focus description is required.");

    const youtubeChannelId = String(formData.get("youtubeChannelId") ?? "").trim() || null;
    const youtubeHandle = String(formData.get("youtubeHandle") ?? "").trim() || null;
    const rssUrlInput = String(formData.get("rssUrl") ?? "").trim() || null;
    const rssUrl = rssUrlInput || resolveRssUrl({ youtubeChannelId, rssUrl: rssUrlInput });

    const values = {
      displayName,
      layer: String(formData.get("layer") ?? "macro_financial") as "macro_financial" | "deep_tech_ai" | "tesla_ownership",
      youtubeChannelId,
      youtubeHandle,
      rssUrl,
      focusDescription,
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

    const verb = id ? "Updated" : "Added";
    // Ingestion needs at least one way to find a feed; warn when none is set.
    const note = !rssUrl && !youtubeHandle ? " (no channel ID, RSS, or handle — ingestion will skip it)" : "";
    return `${verb} "${displayName}".${note}`;
  });
}
