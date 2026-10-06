"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { signOut } from "@/app/(auth)/actions";
import { PlayerSheet } from "@/components/leaderboard/player-sheet";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/components/ui/cn";
import type { SessionUser } from "@/lib/auth";
import { disablePush, enablePush, getPushState, type PushState } from "@/lib/push";
import { useToday } from "@/lib/today";

export function AccountMenu({ user }: { user: SessionUser | null }) {
  const [open, setOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const today = useToday();
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
          className="absolute right-0 top-full z-30 mt-2 w-60 origin-top-right animate-scale-in rounded-xl border border-line bg-surface p-1.5 shadow-card"
        >
          <div className="px-3 py-2">
            <p className="truncate font-semibold text-ink">{user.displayName}</p>
            <p className="truncate text-sm text-ink-muted">{user.email}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setStatsOpen(true);
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-secondary hover:bg-surface-muted hover:text-ink"
          >
            Your stats
          </button>
          <PushToggle />
          <form action={signOut}>
            <SignOutButton />
          </form>
        </div>
      )}
      <PlayerSheet
        player={statsOpen ? { id: user.id, name: user.displayName, you: true } : null}
        today={today}
        onClose={() => setStatsOpen(false)}
      />
    </div>
  );
}

function SignOutButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      role="menuitem"
      disabled={pending}
      className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-secondary hover:bg-surface-muted hover:text-ink disabled:cursor-wait disabled:text-ink-muted disabled:hover:bg-transparent"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}

/** "New puzzle alerts": a push notification when the daily challenge rolls over. Hidden where push can't work. */
function PushToggle() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPushState().then(setState, () => setState("unsupported"));
  }, []);

  if (!state || state === "unsupported") return null;

  async function toggle() {
    setBusy(true);
    try {
      setState(await (state === "on" ? disablePush() : enablePush()));
    } catch (error) {
      console.error("Failed to update new puzzle alerts", error);
    } finally {
      setBusy(false);
    }
  }

  const on = state === "on";
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={on}
      onClick={toggle}
      disabled={busy || state === "denied"}
      className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-secondary hover:bg-surface-muted hover:text-ink disabled:hover:bg-transparent"
    >
      <span>
        New puzzle alerts
        {state === "denied" && <span className="block text-xs text-ink-muted">Blocked in browser settings</span>}
      </span>
      <span
        aria-hidden
        className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", on ? "bg-brand" : "bg-track", busy && "opacity-60")}
      >
        <span
          className={cn("absolute top-0.5 size-4 rounded-full bg-surface shadow-sm transition-transform", on ? "translate-x-4.5" : "translate-x-0.5")}
        />
      </span>
    </button>
  );
}
