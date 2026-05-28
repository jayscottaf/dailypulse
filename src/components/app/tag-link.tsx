import Link from "next/link";
import { cn } from "@/lib/utils";

export function TagLink({
  href,
  tag,
  className,
}: {
  href: string;
  tag: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs font-medium text-foreground transition hover:border-accent/70 hover:bg-muted/60 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {tag}
    </Link>
  );
}
