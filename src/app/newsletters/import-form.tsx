"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { ActionStatus } from "@/components/app/action-status";
import { TOPICS } from "@/lib/topics";
import { importNewsletterAction } from "./actions";

export function NewsletterImportForm() {
  const [result, action, pending] = useActionState(importNewsletterAction, null);
  const field = "mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-base font-normal";
  return <details className="rounded-xl border border-border bg-card p-5" open>
    <summary className="cursor-pointer font-semibold">Save a newsletter excerpt</summary>
    <form action={action} className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium">Newsletter or sender<input name="sender" required maxLength={200} placeholder="For example: ALPA or AwardWallet" className={field} /></label>
      <label className="text-sm font-medium">Subject<input name="subject" required maxLength={300} className={field} /></label>
      <label className="text-sm font-medium">Topic<select name="topic" className={field}>{Object.entries(TOPICS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label className="text-sm font-medium">Received date<input name="receivedAt" type="date" required className={field} /></label>
      <label className="text-sm font-medium sm:col-span-2">Excerpt<textarea name="body" required minLength={20} maxLength={50000} rows={6} placeholder="Paste the useful portion of the email here." className={field} /><span className="mt-2 block text-xs font-normal text-muted-foreground">Stored as text. It stays out of the public feed, search results and daily email.</span></label>
      <div className="sm:col-span-2"><Button disabled={pending}>{pending ? "Saving…" : "Save privately"}</Button><ActionStatus result={result} /></div>
    </form>
  </details>;
}
