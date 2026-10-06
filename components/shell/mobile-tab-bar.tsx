"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/cn";
import { HomeIcon, PodiumIcon } from "@/components/ui/icons";
import { NAV_ITEMS, navTransition } from "./nav";

const ICONS = { "/": HomeIcon, "/leaderboard": PodiumIcon };

export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      // Named so it holds still above the page while a route transition slides the content.
      style={{ viewTransitionName: "tab-bar" }}
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/90 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] backdrop-blur sm:hidden"
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
