"use client";

import { useState, useTransition } from "react";
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
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const Icon = control.icon;

  return (
    <div className="space-y-1.5">
      <Button
        className="w-full"
        variant={control.variant}
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setResult(await control.run());
          })
        }
      >
        <Icon /> {isPending ? control.pendingLabel : control.label}
      </Button>
      {result ? (
        <p role="status" className={cn("text-xs leading-snug", result.ok ? "text-emerald-500" : "text-red-400")}>
          {result.message}
        </p>
      ) : null}
    </div>
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
