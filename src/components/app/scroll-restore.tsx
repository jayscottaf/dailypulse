"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

// Next's <Link> only auto-scrolls when the target Page element isn't already
// visible in the viewport, which never triggers on pages like /archive (the
// content fills the viewport) — pagination/sort/filter clicks leave the user
// at their old scroll offset instead of the top of the new result set.
//
// A window.scrollTo() called synchronously inside a Link's onClick, or even in
// a useEffect + requestAnimationFrame chain, is NOT enough to reliably fix
// this: React runs child effects before parent effects on the same commit, and
// Next's own internal post-navigation scroll handling lives higher in the tree
// (in the router/layout), so it fires AFTER this component's effect and
// silently overwrites the correction back down — confirmed live (the page
// still landed at the old, clamped scroll offset with only an effect + rAF).
// Deferring the final correction to a macrotask (setTimeout) instead of a
// microtask/animation-frame guarantees it runs strictly after every
// synchronous effect from the current commit — including Next's — has
// finished, so it reliably wins.
export function ScrollRestore() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    window.scrollTo({ top: 0 });
    const timers = [0, 50, 150].map((delay) => setTimeout(() => window.scrollTo({ top: 0 }), delay));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- searchParams is stringified implicitly via .toString() below to keep the dep stable
  }, [pathname, searchParams.toString()]);

  return null;
}
