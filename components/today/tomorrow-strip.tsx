"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { TYPE_ICONS } from "@/components/ui/icons";
import { CHALLENGE_TYPES, TYPE_GUIDE, TYPE_META, type ChallengeType } from "@/lib/challenges";
import { formatCountdown } from "@/lib/date";
import { useSecondsToNextChallenge } from "@/lib/today";

/** The challenge types in rotation. Tapping one opens a short guide above the icons. */
export function TomorrowStrip() {
  const [open, setOpen] = useState<ChallengeType | null>(null);
  const [caretX, setCaretX] = useState<number | null>(null);
  const secondsLeft = useSecondsToNextChallenge();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef(new Map<ChallengeType, HTMLButtonElement>());

  // Point the caret at the active icon, wherever the panel ends up horizontally.
  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const button = buttonRefs.current.get(open);
      const panel = panelRef.current;
      if (!button || !panel) return;
      const b = button.getBoundingClientRect();
      setCaretX(b.left + b.width / 2 - panel.getBoundingClientRect().left);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open]);

  // Dismiss on outside press or Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      buttonRefs.current.get(open)?.focus();
      setOpen(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <section aria-label="Challenge types" className="flex flex-col items-center gap-4 sm:gap-5">
      <div className="flex w-full items-center gap-3 sm:max-w-[640px] sm:gap-4">
        <span className="h-px flex-1 bg-line" />
        <p className="text-[13px] text-ink-secondary sm:text-base">
          A different kind of challenge{" "}
          {secondsLeft === null ? (
            "tomorrow."
          ) : (
            <>
              in{" "}
              <time dateTime={`PT${secondsLeft}S`} className="font-semibold tabular-nums text-ink">
                {formatCountdown(secondsLeft)}
              </time>
              .
            </>
          )}
        </p>
        <span className="h-px flex-1 bg-line" />
      </div>
      <div ref={rootRef} className="relative">
        {open && (
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label={`How ${TYPE_META[open].label} works`}
            className="absolute bottom-full left-1/2 z-20 mb-3 w-[min(640px,calc(100vw-2rem))] -translate-x-1/2"
          >
            <Card key={open} className="relative animate-rise p-5 shadow-card sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-ink">{TYPE_META[open].label}</p>
              <h3 className="mt-1.5 font-serif text-2xl font-semibold tracking-[-0.015em] text-ink sm:text-[28px]">
                {TYPE_GUIDE[open].about}
              </h3>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] text-ink-secondary marker:text-ink-faint sm:text-[17px]">
                {TYPE_GUIDE[open].rules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-ink-muted">
                The clock starts when you reveal the challenge. Taking a hint is noted on your result.
              </p>
              {caretX !== null && (
                <span
                  aria-hidden
                  style={{ left: caretX }}
                  className="absolute -bottom-[7px] size-3 -translate-x-1/2 rotate-45 border-r border-b border-line bg-surface"
                />
              )}
            </Card>
          </div>
        )}
        <ul className="flex items-center gap-1 sm:gap-3">
          {CHALLENGE_TYPES.map((t) => {
            const Icon = TYPE_ICONS[t];
            const active = open === t;
            return (
              <li key={t}>
                <button
                  ref={(el) => {
                    if (el) buttonRefs.current.set(t, el);
                    else buttonRefs.current.delete(t);
                  }}
                  type="button"
                  title={TYPE_META[t].label}
                  aria-label={`How ${TYPE_META[t].label} works`}
                  aria-expanded={active}
                  aria-controls={active ? panelId : undefined}
                  onClick={() => setOpen(active ? null : t)}
                  className={cn(
                    "flex size-11 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)] sm:size-14",
                    active ? "bg-brand-soft text-brand-ink" : "text-ink-muted hover:bg-surface-muted hover:text-ink",
                  )}
                >
                  <Icon size={28} className="sm:size-8" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="-mt-1 text-[13px] text-ink-muted sm:text-sm">Tap a challenge to see how it works.</p>
    </section>
  );
}
