import Link from "next/link";
import { Archive, Search, Settings, LayoutGrid, Sun, Video, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Today", icon: Sun },
  { href: "/feed", label: "Feed", icon: LayoutGrid },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/archive", label: "Archive", icon: Archive },
  { href: "/search", label: "Search", icon: Search },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children, compact = false }: { children: React.ReactNode; compact?: boolean }) {
  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-foreground focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-background"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <Video className="size-4" />
            </span>
            <span>
              <span className="block text-sm font-semibold">Jason Daily Pulse</span>
              <span className="block text-xs text-muted-foreground">Your daily catch-up</span>
            </span>
          </Link>
          <nav className="flex w-full items-center justify-between gap-1 sm:w-auto">
            {nav.map((item) => (
              <Link
                key={item.href}
                aria-label={item.label}
                title={item.label}
                href={item.href}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-md px-2 sm:px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                  compact && "px-2",
                )}
              >
                <item.icon className="size-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main id="main-content" className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
