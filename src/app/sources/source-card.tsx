"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Source } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SourceForm } from "./source-form";

// Each source is a large edit form (channel id, handle, RSS URL, focus
// description textarea). Rendering all of them open at once turns the page
// into thousands of pixels of near-identical forms, making it impossible to
// scan the roster. Collapse each source behind a summary row and only render
// its form when expanded.
export function SourceCard({ source, layers }: { source: Source; layers: [string, string][] }) {
  const [open, setOpen] = useState(false);

  return (
    <Card id={source.id}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center justify-between gap-3 p-5 text-left"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              source.isActive ? "bg-accent" : "bg-muted-foreground/40",
            )}
            title={source.isActive ? "Active" : "Inactive"}
          />
          <span className="truncate font-semibold">{source.displayName}</span>
          <Badge variant={source.youtubeChannelId ? "secondary" : "outline"}>
            {source.youtubeChannelId ? "RSS ready" : "Missing channel ID"}
          </Badge>
          <Badge variant="muted">{layers.find(([key]) => key === source.layer)?.[1] ?? source.layer}</Badge>
        </div>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <CardContent className="space-y-4 border-t border-border pt-4">
          <SourceForm source={source} layers={layers} />
        </CardContent>
      ) : null}
    </Card>
  );
}
