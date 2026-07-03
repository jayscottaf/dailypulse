"use client";

import Link, { type LinkProps } from "next/link";
import type { ComponentPropsWithoutRef } from "react";

// Next's <Link> only auto-scrolls to top when the target Page element isn't
// already visible in the viewport (see the framework's scroll docs). Pages
// like /archive fill the viewport, so that heuristic never fires when only
// search params change (e.g. pagination, sort) — the user lands wherever they
// were already scrolled to instead of at the top of the new result set. This
// wrapper forces a scroll-to-top alongside the navigation.
type ScrollTopLinkProps = LinkProps & Omit<ComponentPropsWithoutRef<"a">, keyof LinkProps>;

export function ScrollTopLink({ onClick, ...props }: ScrollTopLinkProps) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        window.scrollTo({ top: 0 });
        onClick?.(event);
      }}
    />
  );
}
