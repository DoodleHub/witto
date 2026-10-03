"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/cn";
import { HomeIcon, PodiumIcon } from "@/components/ui/icons";
import { NAV_ITEMS } from "./nav";

const ICONS = { "/": HomeIcon, "/leaderboard": PodiumIcon };

export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
    >
      <div className="grid h-16 grid-cols-2">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = ICONS[item.href];
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-xs font-medium",
                active ? "text-brand-ink" : "text-ink-muted",
              )}
            >
              <Icon size={24} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
