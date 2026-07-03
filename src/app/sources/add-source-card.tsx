"use client";

import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SourceForm } from "./source-form";

// Mirrors SourceCard's collapse behavior (see source-card.tsx) so the rarely-used
// "Add source" form doesn't push the actual 14-source roster down the page by
// default — collapsed until the user wants to add a new one.
export function AddSourceCard({ layers }: { layers: [string, string][] }) {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-5 text-left"
      >
        <span className="flex items-center gap-2 font-semibold">
          <Plus className="size-4 text-accent" /> Add source
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <CardContent className="border-t border-border pt-4">
          <SourceForm source={null} layers={layers} />
        </CardContent>
      ) : null}
    </Card>
  );
}
