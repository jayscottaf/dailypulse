"use client";

import { useActionState } from "react";
import { sourceCatalog } from "@/lib/source-catalog";
import { TOPICS } from "@/lib/topics";
import { Button } from "@/components/ui/button";
import { ActionStatus } from "@/components/app/action-status";
import { installSourcesAction } from "./actions";

export function SourceLibrary({ installedUrls }: { installedUrls: string[] }) {
  const [result, action, pending] = useActionState(installSourcesAction, null);
  const available = sourceCatalog.filter(source => !installedUrls.includes(source.rssUrl));
  return <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
    <h2 className="text-xl font-semibold">Start with sources worth following</h2>
    <p className="mt-2 text-sm text-muted-foreground">AI, tech and Tesla lead your brief. Aviation, travel and local business add variety. Your daily email stays at 3–5 stories.</p>
    {available.length ? <form action={action} className="mt-5 space-y-5">
      {(["core", "personal", "optional"] as const).map(pack => {
        const entries = available.filter(source => source.pack === pack);
        return entries.length ? <fieldset key={pack}><legend className="mb-3 text-sm font-semibold">{pack === "core" ? "Your main interests" : pack === "personal" ? "More for you" : "Optional: home & 3D design"}</legend><div className="grid gap-3 md:grid-cols-2">{entries.map(source => <label key={source.key} className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm"><input type="checkbox" name="sourceKeys" value={source.key} defaultChecked={pack !== "optional"} className="mt-1" /><span><span className="font-medium">{source.displayName}</span><span className="ml-2 text-xs text-muted-foreground">{TOPICS[source.layer]}</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{source.focusDescription}</span></span></label>)}</div></fieldset> : null;
      })}
      <Button disabled={pending}>{pending ? "Adding sources…" : "Add selected sources"}</Button>
      <ActionStatus result={result} />
    </form> : <p className="mt-4 text-sm text-muted-foreground">All library sources have been added. Manage them below.</p>}
    {!available.length && <ActionStatus result={result} />}
  </section>;
}
