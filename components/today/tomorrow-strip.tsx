"use client";

import { useId, useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { TYPE_ICONS } from "@/components/ui/icons";
import { CHALLENGE_TYPES, TYPE_GUIDE, TYPE_META, type ChallengeType } from "@/lib/challenges";

/** The challenge types in rotation. Tapping one opens a short guide to how it plays. */
export function TomorrowStrip() {
  const [open, setOpen] = useState<ChallengeType | null>(null);
  const panelId = useId();

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
          const active = open === t;
          return (
            <li key={t}>
              <button
                type="button"
                title={TYPE_META[t].label}
                aria-label={`How ${TYPE_META[t].label} works`}
                aria-expanded={active}
                aria-controls={panelId}
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
      {open ? (
        <Card key={open} id={panelId} className="w-full animate-rise p-5 sm:max-w-[640px] sm:p-7">
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
        </Card>
      ) : (
        <p id={panelId} className="-mt-1 text-[13px] text-ink-muted sm:text-sm">
          Tap a challenge to see how it works.
        </p>
      )}
    </section>
  );
}
