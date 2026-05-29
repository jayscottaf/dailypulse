"use client";

import { useActionState } from "react";
import { ActionStatus } from "@/components/app/action-status";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveManualTranscript } from "./actions";

export function TranscriptForm({ videoId, defaultValue }: { videoId: string; defaultValue: string }) {
  const [result, formAction, isPending] = useActionState(saveManualTranscript, null);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={videoId} />
      <Textarea name="transcriptText" defaultValue={defaultValue} placeholder="Paste or edit transcript text here." />
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save manual transcript"}
      </Button>
      <ActionStatus result={result} />
    </form>
  );
}
