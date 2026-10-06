"use client";

import { useRef, useState, type KeyboardEvent, type TouchEvent } from "react";
import { cn } from "@/components/ui/cn";
import { TYPE_ICONS } from "@/components/ui/icons";
import { Overline } from "@/components/ui/overline";
import { Sheet, SheetClose } from "@/components/ui/sheet";
import { CHALLENGE_TYPES, TYPE_GUIDE, TYPE_META, type ChallengeType } from "@/lib/challenges";

/** The challenge types in rotation. Tapping one opens a guide that can step through all of them. */
export function TomorrowStrip() {
  const [open, setOpen] = useState<ChallengeType | null>(null);
  // The guide keeps showing the last type while it closes, rather than going blank.
  const [shown, setShown] = useState<ChallengeType>(CHALLENGE_TYPES[0]);

  const openGuide = (type: ChallengeType) => {
    setShown(type);
    setOpen(type);
  };

  return (
    <section aria-label="Challenge types" className="flex flex-col items-center gap-4 sm:gap-5">
      <div className="flex w-full items-center gap-3 sm:max-w-[640px] sm:gap-4">
        <span className="h-px flex-1 bg-line" />
        <p className="text-[13px] text-ink-secondary sm:text-base">A different kind of challenge tomorrow.</p>
        <span className="h-px flex-1 bg-line" />
      </div>
      <ul className="flex items-center gap-1 sm:gap-3">
        {CHALLENGE_TYPES.map((t) => {
          const Icon = TYPE_ICONS[t];
          return (
            <li key={t}>
              <button
                type="button"
                title={TYPE_META[t].label}
                aria-label={`How ${TYPE_META[t].label} works`}
                aria-haspopup="dialog"
                onClick={() => openGuide(t)}
                className={cn(
                  "flex size-11 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)] sm:size-14",
                  open === t ? "bg-brand-soft text-brand-ink" : "text-ink-muted hover:bg-surface-muted hover:text-ink",
                )}
              >
                <Icon size={28} className="sm:size-8" />
              </button>
            </li>
          );
        })}
      </ul>
      <p className="-mt-1 text-[13px] text-ink-muted sm:text-sm">Tap a challenge to see how it works.</p>

      <Sheet open={open !== null} onClose={() => setOpen(null)} labelledBy="challenge-guide-title" className="sm:max-w-[520px]">
        <ChallengeGuide type={shown} onSelect={openGuide} onClose={() => setOpen(null)} />
      </Sheet>
    </section>
  );
}

/** How each challenge type works, with the types as tabs along the top. */
function ChallengeGuide({
  type,
  onSelect,
  onClose,
}: {
  type: ChallengeType;
  onSelect: (type: ChallengeType) => void;
  onClose: () => void;
}) {
  const tabRefs = useRef(new Map<ChallengeType, HTMLButtonElement>());
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const index = CHALLENGE_TYPES.indexOf(type);

  const step = (by: number, focus = false) => {
    const next = CHALLENGE_TYPES[(index + by + CHALLENGE_TYPES.length) % CHALLENGE_TYPES.length];
    onSelect(next);
    if (focus) tabRefs.current.get(next)?.focus();
  };

  // Tabs follow the usual arrow-key pattern, so keyboard players can browse without tabbing through each one.
  const onTabKeyDown = (e: KeyboardEvent) => {
    const moves: Record<string, () => void> = {
      ArrowRight: () => step(1, true),
      ArrowLeft: () => step(-1, true),
      Home: () => step(-index, true),
      End: () => step(CHALLENGE_TYPES.length - 1 - index, true),
    };
    if (!moves[e.key]) return;
    e.preventDefault();
    moves[e.key]();
  };

  // A clear sideways swipe steps through the types on phones. Mostly vertical drags are left to scroll the sheet.
  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    swipeStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
  };

  return (
    <div className="px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:px-7 sm:pt-6 sm:pb-7">
      <div className="flex items-center gap-2">
        <div role="tablist" aria-label="Challenge types" className="flex flex-1 items-center justify-between sm:justify-start sm:gap-1.5">
          {CHALLENGE_TYPES.map((t) => {
            const Icon = TYPE_ICONS[t];
            const active = t === type;
            return (
              <button
                key={t}
                ref={(el) => {
                  if (el) tabRefs.current.set(t, el);
                  else tabRefs.current.delete(t);
                }}
                type="button"
                role="tab"
                id={`challenge-guide-tab-${t}`}
                aria-selected={active}
                aria-controls="challenge-guide-panel"
                aria-label={TYPE_META[t].label}
                title={TYPE_META[t].label}
                tabIndex={active ? 0 : -1}
                onClick={() => onSelect(t)}
                onKeyDown={onTabKeyDown}
                className={cn(
                  "flex size-10 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)] sm:size-11",
                  active ? "bg-brand-soft text-brand-ink" : "text-ink-faint hover:bg-surface-muted hover:text-ink",
                )}
              >
                <Icon size={22} />
              </button>
            );
          })}
        </div>
        <SheetClose onClick={onClose} className="-mr-2" />
      </div>

      <div
        id="challenge-guide-panel"
        role="tabpanel"
        aria-labelledby={`challenge-guide-tab-${type}`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        // Every guide shares one grid cell, so the sheet is as tall as the longest and doesn't jump between types.
        className="mt-5 grid [grid-template-areas:'guide']"
      >
        {CHALLENGE_TYPES.map((t) => (
          <div
            key={t}
            className={cn("[grid-area:guide]", t === type ? "animate-rise" : "invisible")}
            aria-hidden={t !== type}
          >
            <Overline className="font-semibold text-brand-ink sm:text-xs">{TYPE_META[t].label}</Overline>
            <h2
              id={t === type ? "challenge-guide-title" : undefined}
              className="mt-1.5 font-serif text-2xl font-semibold tracking-[-0.015em] text-ink sm:text-[28px]"
            >
              {TYPE_GUIDE[t].about}
            </h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] text-ink-secondary marker:text-ink-faint sm:text-base">
              {TYPE_GUIDE[t].rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="mt-5 border-t border-line pt-4 text-sm text-ink-muted">
        The clock starts when you reveal the challenge. Taking a hint is noted on your result.
      </p>
    </div>
  );
}
