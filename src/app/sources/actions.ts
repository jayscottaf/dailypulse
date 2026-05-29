"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sources } from "@/db/schema";
import { isAdminSession } from "@/lib/page-auth";
import { resolveRssUrl } from "@/lib/source-roster";
import { lookupChannelIdByHandle } from "@/lib/youtube-api";
import { runAction, type ActionResult } from "@/lib/action-result";

async function assertAdmin() {
  if (!(await isAdminSession())) throw new Error("Unauthorized.");
}

export type ResolveResult = ActionResult & { channelId?: string };

// Look up a YouTube channel ID from an @handle via the Data API. Returns the id
// for the form to fill in. No-ops gracefully when YOUTUBE_API_KEY is unset
// (lookupChannelIdByHandle returns null in that case).
export async function resolveHandle(handle: string): Promise<ResolveResult> {
  try {
    await assertAdmin();
    const trimmed = handle.trim();
    if (!trimmed) return { ok: false, message: "Enter a handle first (e.g. @PBoyle)." };

    const channelId = await lookupChannelIdByHandle(trimmed);
    if (!channelId) {
      return {
        ok: false,
        message: process.env.YOUTUBE_API_KEY
          ? `No channel found for "${trimmed}".`
          : "Set YOUTUBE_API_KEY to resolve handles automatically.",
      };
    }

    return { ok: true, message: `Resolved to ${channelId}.`, channelId };
  } catch (error) {
    return { ok: false, message: `Resolve failed: ${error instanceof Error ? error.message : String(error)}` };
  }
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
