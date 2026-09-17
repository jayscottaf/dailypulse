"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isAdminSession } from "@/lib/page-auth";
import { readerContext, setReaderPreferences, setReadingState } from "@/lib/reader-store";
import { preferencesSchema } from "@/lib/reader-preferences";

const stateInput = z.object({ videoId: z.string().uuid(), field: z.enum(["saved", "read", "less"]), value: z.boolean() });

export async function updateReadingState(input: z.infer<typeof stateInput>) {
  try {
    if (!(await isAdminSession())) throw new Error("Please sign in to change your reading preferences.");
    const { videoId, field, value } = stateInput.parse(input);
    const state = await setReadingState(videoId, field, value);
    revalidatePath("/saved");
    revalidatePath("/feed");
    revalidatePath("/daily-pulse/[slug]", "page");
    return { ok: true as const, state };
  } catch { return { ok: false as const, message: "Could not save that change. Please try again." }; }
}

export async function saveReaderPreferences(_previous: { message: string }, form: FormData) {
  try {
    if (!(await isAdminSession())) throw new Error("Please sign in first.");
    const current = await readerContext();
    const preferences = preferencesSchema.parse({
      ...current.preferences,
      topics: form.getAll("topics"), interests: String(form.get("interests") ?? "").trim(),
      layout: form.get("layout"), theme: form.get("theme"), briefLength: Number(form.get("briefLength")),
      mutedSourceIds: form.getAll("mutedSourceIds"),
    });
    await setReaderPreferences(preferences);
    (await cookies()).set("pulse-theme", preferences.theme, { path: "/", maxAge: 31536000, sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production" });
    revalidatePath("/", "layout");
    return { message: "Preferences saved. Your feed updates now; your next briefing and email will use these choices." };
  } catch { return { message: "Unable to save preferences. Check your selections and try again." }; }
}
