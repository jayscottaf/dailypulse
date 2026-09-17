"use client";

import { useActionState, useState } from "react";
import { saveReaderPreferences } from "@/app/reader-actions";
import { TOPICS } from "@/lib/stories";
import type { ReaderPreferences } from "@/lib/reader-preferences";
import { Button } from "@/components/ui/button";

export function ReaderSettings({ preferences, sources }: { preferences: ReaderPreferences; sources: { id: string; displayName: string }[] }) {
  const [values, setValues] = useState(preferences);
  const [state, action, pending] = useActionState(saveReaderPreferences, { message: "" });
  const selectClass = "mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm";
  return <form action={action} className="max-w-2xl space-y-7">
    <fieldset><legend className="font-medium">Topics to follow</legend><div className="mt-3 flex flex-wrap gap-4">{Object.entries(TOPICS).map(([key, label]) => <label key={key} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="topics" value={key} checked={values.topics.includes(key as keyof typeof TOPICS)} onChange={event => { const checked = event.currentTarget.checked; setValues(current => ({ ...current, topics: checked ? [...current.topics, key as keyof typeof TOPICS] : current.topics.filter(topic => topic !== key) })); }} className="size-4 accent-amber-500" />{label}</label>)}</div></fieldset>
    <label className="block text-sm font-medium">What are you especially interested in?<textarea name="interests" maxLength={500} value={values.interests} onChange={event => { const value = event.currentTarget.value; setValues(current => ({ ...current, interests: value })); }} placeholder="For example: practical AI workflows, battery range, cash flow" className="mt-2 min-h-24 w-full rounded-md border border-input bg-background p-3 text-base font-normal" /><span className="block text-xs font-normal text-muted-foreground">Separate interests with commas. Matching stories get more prominence.</span></label>
    <div className="grid gap-5 sm:grid-cols-3">
      <label className="text-sm font-medium">Briefing length<select name="briefLength" value={values.briefLength} onChange={event => { const value = Number(event.currentTarget.value) as 3 | 5; setValues(current => ({ ...current, briefLength: value })); }} className={selectClass}><option value="3">Up to 3 stories</option><option value="5">Up to 5 stories</option></select></label>
      <label className="text-sm font-medium">Default feed<select name="layout" value={values.layout} onChange={event => { const value = event.currentTarget.value as "cards" | "list"; setValues(current => ({ ...current, layout: value })); }} className={selectClass}><option value="cards">Visual cards</option><option value="list">Compact list</option></select></label>
      <label className="text-sm font-medium">Appearance<select name="theme" value={values.theme} onChange={event => { const value = event.currentTarget.value as "light" | "dark"; setValues(current => ({ ...current, theme: value })); }} className={selectClass}><option value="dark">Dark</option><option value="light">Light</option></select></label>
    </div>
    <details className="rounded-lg border border-border p-4"><summary className="cursor-pointer font-medium">Muted sources</summary><p className="mt-3 text-sm text-muted-foreground">Checked sources stay out of your feed and future briefings. Uncheck to bring one back.</p><div className="mt-2 space-y-1">{sources.map(source => <label key={source.id} className="flex min-h-11 items-center gap-3 text-sm"><input name="mutedSourceIds" type="checkbox" value={source.id} checked={values.mutedSourceIds.includes(source.id)} onChange={event => { const checked = event.currentTarget.checked; setValues(current => ({ ...current, mutedSourceIds: checked ? [...current.mutedSourceIds, source.id] : current.mutedSourceIds.filter(id => id !== source.id) })); }} className="size-4 shrink-0 accent-amber-500" />{source.displayName}</label>)}</div></details>
    <div className="flex flex-wrap items-center gap-3"><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save preferences"}</Button><p role="status" className="text-sm text-muted-foreground">{state.message}</p></div>
  </form>;
}
