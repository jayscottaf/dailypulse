"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

// Long report/archive pages have no other way back up besides manual
// scrolling. Show a floating button once the user has scrolled past a
// threshold; clicking it scrolls smoothly back to the top of the page.
//
// Hidden again near the very bottom of the page: both the report page and
// archive have real controls (prev/next report nav, pagination) in that
// bottom-right corner, and a fixed button sitting on top of them would
// silently swallow clicks meant for those controls.
export function BackToTop({ threshold = 600, bottomMargin = 220 }: { threshold?: number; bottomMargin?: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      const distanceFromBottom = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
      setVisible(window.scrollY > threshold && distanceFromBottom > bottomMargin);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [threshold, bottomMargin]);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      className={cn(
        "fixed bottom-6 right-6 z-40 flex size-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-lg transition",
        "hover:border-accent/70 hover:text-accent",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <ArrowUp className="size-5" />
    </button>
  );
}
