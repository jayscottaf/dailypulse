"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

// Next's <Link> only auto-scrolls when the target Page element isn't already
// visible in the viewport, which never triggers on pages like /archive (the
// content fills the viewport) — pagination/sort/filter clicks leave the user
// at their old scroll offset instead of the top of the new result set.
//
// A window.scrollTo() called synchronously inside a Link's onClick does NOT
// reliably fix this: Next's own post-navigation scroll handling (and/or the
// browser's native history scroll restoration) runs again once the new
// content commits and overwrites it back down. Driving the scroll from a
// useEffect keyed on the route/search-params instead fires after the new
// content has actually painted, and re-asserting across a couple of animation
// frames wins any remaining race.
export function ScrollRestore() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    window.scrollTo({ top: 0 });
    const raf = requestAnimationFrame(() => {
      window.scrollTo({ top: 0 });
      requestAnimationFrame(() => window.scrollTo({ top: 0 }));
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- searchParams is stringified implicitly via .toString() below to keep the dep stable
  }, [pathname, searchParams.toString()]);

  return null;
}
