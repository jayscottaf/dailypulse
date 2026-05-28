"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveReportFeedback, type FeedbackActionState } from "./actions";

type FeedbackVote = "up" | "down";

function VoteButton({
  vote,
  selectedVote,
}: {
  vote: FeedbackVote;
  selectedVote?: FeedbackVote;
}) {
  const { pending } = useFormStatus();
  const isSelected = selectedVote === vote;
  const Icon = vote === "up" ? ThumbsUp : ThumbsDown;

  return (
    <button
      type="submit"
      name="vote"
      value={vote}
      disabled={pending || isSelected}
      aria-pressed={isSelected}
      aria-label={vote === "up" ? "Show more items like this" : "Show fewer items like this"}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition hover:border-accent/60 hover:text-foreground disabled:cursor-default",
        isSelected && "border-accent/90 bg-accent/20 text-accent shadow-sm shadow-accent/10",
        pending && "opacity-60",
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export function FeedbackControls({
  selectedVote,
  reportId,
  sectionTitle,
  subsectionTitle,
  itemIndex,
  itemText,
  sourceVideoIds,
  tags,
}: {
  selectedVote?: FeedbackVote;
  reportId: string;
  sectionTitle: string;
  subsectionTitle: string;
  itemIndex: number;
  itemText: string;
  sourceVideoIds: string[];
  tags: string[];
}) {
  const initialState: FeedbackActionState = {
    selectedVote,
    status: selectedVote ? "saved" : "idle",
    message: selectedVote ? "Saved" : undefined,
  };
  const [state, formAction] = useActionState(saveReportFeedback, initialState);
  const activeVote = state.selectedVote ?? selectedVote;
  const statusText =
    state.status === "error"
      ? state.message
      : activeVote
        ? state.status === "unchanged"
          ? "Already saved"
          : "Saved"
        : "Tune";

  return (
    <form action={formAction} className="mt-2 flex items-center gap-1">
      <input type="hidden" name="reportId" value={reportId} />
      <input type="hidden" name="sectionTitle" value={sectionTitle} />
      <input type="hidden" name="subsectionTitle" value={subsectionTitle} />
      <input type="hidden" name="itemIndex" value={itemIndex} />
      <input type="hidden" name="itemText" value={itemText} />
      <input type="hidden" name="sourceVideoIds" value={JSON.stringify(sourceVideoIds)} />
      <input type="hidden" name="tags" value={JSON.stringify(tags)} />
      <span
        className={cn(
          "mr-1 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground",
          state.status === "error" && "text-destructive",
          activeVote && state.status !== "error" && "text-accent",
        )}
      >
        {statusText}
      </span>
      <VoteButton vote="up" selectedVote={activeVote} />
      <VoteButton vote="down" selectedVote={activeVote} />
    </form>
  );
}
