"use client";

import { useState, type CSSProperties } from "react";
import { cn } from "@/components/ui/cn";
import { Overline } from "@/components/ui/overline";
import { Skeleton } from "@/components/ui/skeleton";
import { formatEarned, type Achievement, type AchievementId } from "@/lib/achievements";
import { Medal } from "./medal";

/**
 * A player's earned medals on their profile card, newest first. Tapping one names it underneath, since phones
 * have no tooltips. `undefined` while loading and "error" when it couldn't load.
 */
export function AchievementShelf({ achievements }: { achievements: Achievement[] | "error" | undefined }) {
  const [selected, setSelected] = useState<AchievementId | null>(null);
  if (achievements === "error") return null;

  const earned = achievements
    ?.filter((a) => a.earnedOn)
    .sort((x, y) => (y.earnedOn ?? "").localeCompare(x.earnedOn ?? ""));
  const picked = earned?.find((a) => a.id === selected);

  return (
    <section aria-labelledby="shelf-title">
      <div className="mt-6 flex items-baseline justify-between">
        <Overline className="sm:text-xs">
          <span id="shelf-title">Achievements</span>
        </Overline>
        {achievements && earned && (
          <span className="text-xs tabular-nums text-ink-muted">
            {earned.length} of {achievements.length}
          </span>
        )}
      </div>
      {!earned ? (
        <div className="mt-3 flex gap-2.5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="size-11 rounded-full" />
          ))}
        </div>
      ) : earned.length === 0 ? (
        <p className="mt-2 text-[15px] text-ink-secondary">No achievements yet.</p>
      ) : (
        <>
          <ul className="mt-3 flex flex-wrap gap-2.5">
            {earned.map((a, i) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => setSelected(a.id === selected ? null : a.id)}
                  aria-pressed={a.id === selected}
                  aria-label={a.title}
                  className={cn(
                    "flex rounded-full outline-none transition-transform duration-200 ease-[var(--ease-spring)] focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)] active:scale-95",
                    a.id === selected ? "-translate-y-0.5 ring-2 ring-brand ring-offset-2 ring-offset-surface" : "hover:-translate-y-0.5",
                  )}
                >
                  <Medal
                    achievement={a}
                    size={44}
                    className="stagger animate-scale-in"
                    style={{ "--i": i } as CSSProperties}
                  />
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 min-h-[2.5rem] text-sm" aria-live="polite">
            {picked ? (
              <span key={picked.id} className="block animate-fade-in">
                <span className="font-semibold text-ink">{picked.title}</span>
                <span className="text-ink-muted"> · {formatEarned(picked.earnedOn!)}</span>
                <span className="block text-ink-secondary">{picked.description}</span>
              </span>
            ) : (
              <span className="text-ink-muted">Tap a medal to see what it&apos;s for.</span>
            )}
          </p>
        </>
      )}
    </section>
  );
}
