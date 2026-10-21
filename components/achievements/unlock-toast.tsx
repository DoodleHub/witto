"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/ui/icons";
import { Overline } from "@/components/ui/overline";
import type { Achievement } from "@/lib/achievements";
import { Medal } from "./medal";

/** How long the toast stays up before it slips away on its own. */
const SHOW_MS = 7000;
/** Matches --animate-toast-out. */
const LEAVE_MS = 220;

/**
 * Announces newly earned achievements: a card that springs up above the tab bar with the medal spinning in. Tapping
 * it opens them on the Achievements tab. It leaves by itself after a few seconds, but stays while hovered or
 * focused so nobody loses it mid-read.
 */
export function UnlockToast({
  unlocked,
  onOpen,
  onDismiss,
}: {
  unlocked: Achievement[];
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const [leaving, setLeaving] = useState(false);
  const [held, setHeld] = useState(false);
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  });

  useEffect(() => {
    if (held) return;
    const leave = setTimeout(() => setLeaving(true), SHOW_MS);
    return () => clearTimeout(leave);
  }, [held]);

  useEffect(() => {
    if (!leaving) return;
    const done = setTimeout(() => dismissRef.current(), LEAVE_MS);
    return () => clearTimeout(done);
  }, [leaving]);

  const single = unlocked.length === 1 ? unlocked[0] : null;
  const shown = unlocked.slice(0, 3);

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-40 flex justify-center px-4 sm:bottom-8"
    >
      <div
        onMouseEnter={() => setHeld(true)}
        onMouseLeave={() => setHeld(false)}
        onFocus={() => setHeld(true)}
        onBlur={() => setHeld(false)}
        className={`pointer-events-auto relative w-full max-w-[400px] overflow-hidden rounded-2xl border border-brand-line bg-surface-raised shadow-card ${
          leaving ? "animate-toast-out" : "animate-toast-in"
        }`}
      >
        <button
          type="button"
          onClick={onOpen}
          className="flex w-full items-center gap-3.5 py-3.5 pl-4 pr-12 text-left outline-none focus-visible:bg-brand-subtle"
        >
          <span className="flex shrink-0 items-center">
            {shown.map((a, i) => (
              <Medal
                key={a.id}
                achievement={a}
                size={single ? 52 : 44}
                celebrate
                className={i > 0 ? "-ml-4 rounded-full ring-[3px] ring-surface-raised" : undefined}
                style={{ zIndex: shown.length - i, "--i": i } as CSSProperties}
              />
            ))}
          </span>
          <span className="min-w-0 flex-1">
            <Overline className="truncate font-semibold text-brand-ink sm:text-[11px]">
              {single ? "Achievement unlocked" : `${unlocked.length} achievements unlocked`}
            </Overline>
            <span className="mt-0.5 block truncate font-serif text-lg font-semibold leading-snug text-ink">
              {single ? single.title : unlocked.map((a) => a.title).join(", ")}
            </span>
            <span className="block truncate text-[13px] text-ink-muted">
              {single ? single.description : "Tap to see them"}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setLeaving(true)}
          aria-label="Dismiss"
          className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
        >
          <CloseIcon size={18} />
        </button>
        {/* Counts down to the toast leaving; it pauses while held. */}
        <span
          aria-hidden="true"
          key={held ? "held" : "running"}
          className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-brand/40"
          style={{ animation: held ? "none" : `toast-timer ${SHOW_MS}ms linear both` }}
        />
      </div>
    </div>,
    document.body,
  );
}
