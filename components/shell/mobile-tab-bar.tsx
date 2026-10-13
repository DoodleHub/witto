"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/cn";
import { HomeIcon, PodiumIcon } from "@/components/ui/icons";
import { NAV_ITEMS, navTransition } from "./nav";

const ICONS = { "/": HomeIcon, "/leaderboard": PodiumIcon };

/** Whether focusing this element opens the on-screen keyboard. */
function isTextField(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  if (el instanceof HTMLTextAreaElement || el.isContentEditable) return true;
  return (
    el instanceof HTMLInputElement &&
    !["button", "checkbox", "color", "file", "hidden", "image", "radio", "range", "reset", "submit"].includes(el.type)
  );
}

/**
 * True while a text field has focus. iOS pins fixed elements to the layout viewport, and with the keyboard up the
 * visible area scrolls within it, so a bottom bar floats mid-page. Native apps hide their tab bar while typing too.
 */
function useTyping() {
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => setTyping(isTextField(e.target));
    // relatedTarget is where focus is going, so moving between crossword squares never flashes the bar.
    const onFocusOut = (e: FocusEvent) => setTyping(isTextField(e.relatedTarget));
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);
  return typing;
}

export function MobileTabBar() {
  const pathname = usePathname();
  const typing = useTyping();
  return (
    <nav
      aria-label="Main"
      // Named so it holds still above the page while a route transition slides the content.
      style={{ viewTransitionName: "tab-bar" }}
      className={cn(
        "fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/90 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] backdrop-blur sm:hidden",
        typing && "hidden",
      )}
    >
      <div className="grid h-16 grid-cols-2">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = ICONS[item.href];
          return (
            <Link
              key={item.href}
              href={item.href}
              transitionTypes={navTransition(pathname, item.href)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors active:[&>span]:scale-90",
                active ? "text-brand-ink" : "text-ink-muted",
              )}
            >
              <span className="relative flex h-8 w-16 items-center justify-center transition-transform">
                {active && <span className="absolute inset-0 animate-scale-in rounded-full bg-brand-soft" />}
                <Icon size={24} className="relative" />
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
