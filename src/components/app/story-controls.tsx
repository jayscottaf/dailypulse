"use client";

import { useState, useTransition } from "react";
import { Bookmark, Check, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateReadingState } from "@/app/reader-actions";
import { emptyReadingState, type ReadingState } from "@/lib/reader-preferences";

export function StoryControls({ videoId, initial = emptyReadingState }: { videoId: string; initial?: ReadingState }) {
  const [state, setState] = useState(initial);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  function change(field: keyof ReadingState) {
    startTransition(async () => {
      const result = await updateReadingState({ videoId, field, value: !state[field] });
      if (result.ok) {
        setState(result.state);
        setMessage(field === "saved" ? result.state.saved ? "Saved for later." : "Removed from saved." : field === "read" ? result.state.read ? "Marked as read." : "Marked as unread." : result.state.less ? "You'll see less from this source in future briefings." : "Preference cleared.");
      } else setMessage(result.message);
    });
  }
  return <div className="mt-4 border-t border-border pt-3"><div className="flex flex-wrap gap-1">
    <Button size="sm" variant="ghost" disabled={pending} aria-pressed={state.saved} onClick={() => change("saved")}><Bookmark />{state.saved ? "Saved" : "Save"}</Button>
    <Button size="sm" variant="ghost" disabled={pending} aria-pressed={state.read} onClick={() => change("read")}><Check />{state.read ? "Read" : "Already read"}</Button>
    <Button size="sm" variant="ghost" disabled={pending} aria-pressed={state.less} onClick={() => change("less")}><ThumbsDown />{state.less ? "Less requested" : "Less like this"}</Button>
  </div><p role="status" className="mt-2 text-xs text-muted-foreground">{message}</p></div>;
}
