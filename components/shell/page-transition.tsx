import { ViewTransition, type ReactNode } from "react";

const SLIDE = { "nav-forward": "nav-forward", "nav-back": "nav-back", crossfade: "crossfade", default: "none" };

/**
 * Wraps a route's content (in both its page and its loading fallback) so navigations tagged by the nav links slide
 * in their direction. Untagged changes, such as the browser's back button or a Suspense reveal, swap instantly.
 * It has to sit in each page rather than the layout, since a layout persists and never enters or exits.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={SLIDE} exit={SLIDE} default="none">
      {children}
    </ViewTransition>
  );
}
