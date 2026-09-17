"use server";

import { revalidatePath } from "next/cache";
import { importPrivateNewsletter, archivePrivateNewsletter } from "@/lib/private-newsletters";
import type { ActionResult } from "@/lib/action-result";

export async function importNewsletterAction(_previous: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const added = await importPrivateNewsletter(Object.fromEntries(["sender", "subject", "topic", "receivedAt", "body"].map(key => [key, form.get(key)])));
    revalidatePath("/newsletters");
    return { ok: true, message: added ? "Saved to your private inbox." : "This excerpt is already in your inbox or archive." };
  } catch {
    // Never log email bodies or echo database/validation payloads to the client.
    return { ok: false, message: "Could not save. Check your sign-in, date and required fields. Excerpts must be 20–50,000 characters." };
  }
}

export async function archiveNewsletterAction(form: FormData) {
  await archivePrivateNewsletter(String(form.get("id")), form.get("archived") === "true");
  revalidatePath("/newsletters");
}
