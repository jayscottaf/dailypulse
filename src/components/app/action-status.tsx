import { AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/action-result";

// Inline status line for server-action results. Pairs the message with an icon
// so success/failure isn't conveyed by color alone (a11y), and carries
// role="status" so screen readers announce it.
export function ActionStatus({ result, className }: { result: ActionResult | null; className?: string }) {
  if (!result) return null;
  const Icon = result.ok ? Check : AlertCircle;

  return (
    <p
      role="status"
      className={cn(
        "flex items-center gap-1 text-xs leading-snug",
        result.ok ? "text-emerald-500" : "text-red-400",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{result.message}</span>
    </p>
  );
}
