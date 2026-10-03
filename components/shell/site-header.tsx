"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/cn";
import { SparkleMark } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { SessionUser } from "@/lib/auth";
import { AccountMenu } from "./account-menu";
import { NAV_ITEMS } from "./nav";

/** `user` is undefined while the session is still loading. */
export function SiteHeader({ user }: { user: SessionUser | null | undefined }) {
  const pathname = usePathname();
  return (
    <header className="border-b border-transparent sm:border-line">
      <div className="relative mx-auto flex h-16 max-w-[1120px] items-center justify-between px-4 sm:h-[72px] sm:px-8">
        <Link href="/" className="flex items-center gap-2 sm:gap-2.5" aria-label="Witto home">
          <SparkleMark size={30} className="sm:size-9" />
          <span className="text-2xl font-semibold tracking-[-0.01em] text-ink sm:text-[28px]">Witto</span>
        </Link>

        <nav aria-label="Main" className="absolute left-1/2 hidden h-[72px] -translate-x-1/2 items-stretch gap-2 sm:flex">
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center px-2.5 text-[15px] transition-colors",
                  active ? "font-semibold text-ink" : "text-ink-secondary hover:text-ink",
                )}
              >
                {item.label}
                {active && <span className="absolute inset-x-0 bottom-[-1px] h-0.5 rounded-full bg-brand" />}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {user === undefined ? <Skeleton className="size-10 rounded-full" /> : <AccountMenu user={user} />}
        </div>
      </div>
    </header>
  );
}
