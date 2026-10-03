"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/(auth)/actions";
import { Avatar } from "@/components/ui/avatar";
import type { SessionUser } from "@/lib/auth";

export function AccountMenu({ user }: { user: SessionUser | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex h-9 items-center rounded-md px-3.5 text-sm font-semibold text-ink-secondary transition-colors hover:bg-surface-muted hover:text-ink"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account: ${user.displayName}`}
        className="flex rounded-full outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)]"
      >
        <Avatar name={user.displayName} you size={40} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-60 rounded-xl border border-line bg-surface p-1.5 shadow-card"
        >
          <div className="px-3 py-2">
            <p className="truncate font-semibold text-ink">{user.displayName}</p>
            <p className="truncate text-sm text-ink-muted">{user.email}</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              role="menuitem"
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-secondary hover:bg-surface-muted hover:text-ink"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
