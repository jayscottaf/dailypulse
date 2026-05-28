"use client";

import { useActionState } from "react";
import { Mail, Newspaper, Play, Search } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  generateReportAction,
  rebuildSearchAction,
  runIngestionAction,
  sendTodayEmailAction,
  type ActionResult,
} from "@/app/admin/control-actions";

type ControlAction = {
  key: string;
  label: string;
  pendingLabel: string;
  icon: typeof Play;
  variant: ButtonProps["variant"];
  run: () => Promise<ActionResult>;
};

const CONTROLS: ControlAction[] = [
  { key: "ingest", label: "Run ingestion now", pendingLabel: "Ingesting…", icon: Play, variant: "default", run: runIngestionAction },
  { key: "report", label: "Generate today's report", pendingLabel: "Generating…", icon: Newspaper, variant: "secondary", run: generateReportAction },
  { key: "email", label: "Send today's email", pendingLabel: "Sending…", icon: Mail, variant: "outline", run: sendTodayEmailAction },
  { key: "search", label: "Rebuild search index", pendingLabel: "Rebuilding…", icon: Search, variant: "outline", run: rebuildSearchAction },
];

function ControlButton({ control }: { control: ControlAction }) {
  // useActionState holds the action's return value as state that survives the
  // revalidatePath() refresh the action triggers, so the success/error text
  // actually sticks instead of flashing and disappearing.
  const [result, formAction, isPending] = useActionState<ActionResult | null>(
    () => control.run(),
    null,
  );
  const Icon = control.icon;

  return (
    <form action={formAction} className="space-y-1.5">
      <Button className="w-full" type="submit" variant={control.variant} disabled={isPending}>
        <Icon /> {isPending ? control.pendingLabel : control.label}
      </Button>
      {result ? (
        <p role="status" className={cn("text-xs leading-snug", result.ok ? "text-emerald-500" : "text-red-400")}>
          {result.message}
        </p>
      ) : null}
    </form>
  );
}

export function PipelineControls() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {CONTROLS.map((control) => (
        <ControlButton key={control.key} control={control} />
      ))}
    </div>
  );
}
