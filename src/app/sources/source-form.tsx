"use client";

import { useActionState } from "react";
import type { Source } from "@/db/schema";
import { ActionStatus } from "@/components/app/action-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveSource } from "./actions";

// One form for both "add" (source = null) and "edit" (source provided). Field
// ids are suffixed so multiple forms on the page don't collide. Feedback is
// shown inline via useActionState + ActionStatus, matching pipeline-controls.
export function SourceForm({ source, layers }: { source?: Source | null; layers: [string, string][] }) {
  const [result, formAction, isPending] = useActionState(saveSource, null);
  const suffix = source?.id ?? "new";

  return (
    <form action={formAction} className="grid gap-4 md:grid-cols-2">
      {source ? <input type="hidden" name="id" value={source.id} /> : null}

      <FormField name="displayName" suffix={suffix} label="Display name" defaultValue={source?.displayName} required />
      <div className="space-y-2">
        <Label htmlFor={`layer-${suffix}`}>Layer</Label>
        <select
          id={`layer-${suffix}`}
          name="layer"
          defaultValue={source?.layer}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {layers.map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>
      <FormField name="youtubeChannelId" suffix={suffix} label="YouTube channel ID" defaultValue={source?.youtubeChannelId ?? ""} />
      <FormField name="youtubeHandle" suffix={suffix} label="YouTube handle" defaultValue={source?.youtubeHandle ?? ""} />
      <FormField name="rssUrl" suffix={suffix} label="RSS URL" defaultValue={source?.rssUrl ?? ""} />
      <label className="flex items-center gap-2 pt-8 text-sm">
        <input name="isActive" type="checkbox" defaultChecked={source ? source.isActive : true} /> Active
      </label>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor={`focusDescription-${suffix}`}>Focus description</Label>
        <Textarea id={`focusDescription-${suffix}`} name="focusDescription" defaultValue={source?.focusDescription} required />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Button type="submit" variant={source ? "outline" : "default"} className="w-full" disabled={isPending}>
          {isPending ? (source ? "Updating…" : "Saving…") : source ? "Update source" : "Save source"}
        </Button>
        <ActionStatus result={result} />
      </div>
    </form>
  );
}

function FormField({
  name,
  suffix,
  label,
  defaultValue,
  required,
}: {
  name: string;
  suffix: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
}) {
  const id = `${name}-${suffix}`;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} defaultValue={defaultValue} required={required} />
    </div>
  );
}
