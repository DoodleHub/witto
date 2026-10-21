"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Overline } from "@/components/ui/overline";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ACHIEVEMENT_GROUPS,
  fetchAchievements,
  formatEarned,
  isAchievementId,
  markAchievementsSeen,
  nextUp,
  recentlyEarned,
  type Achievement,
  type AchievementId,
} from "@/lib/achievements";
import { createClient } from "@/lib/supabase/client";
import { useToday } from "@/lib/today";
import { AchievementRow } from "./achievement-row";
import { Medal, ProgressBar } from "./medal";

/** How long a row linked to stays lit up. */
const HIGHLIGHT_MS = 2400;

/** Brings an achievement's row into view. */
function scrollToRow(id: AchievementId) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById(`achievement-${id}`)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
}

/**
 * The Achievements tab: a summary of how far the player has come, then every achievement grouped by kind, each
 * with its description and status in full. Anything earned that they haven't been shown yet spins in as it loads
 * and is recorded as seen; it and anything earned today keep a "New" tag for the visit. `focus` scrolls to one
 * achievement and lights it up (the unlock toast links here).
 */
export function AchievementsView({ userId, focus }: { userId: string; focus: string | null }) {
  const today = useToday();
  const [list, setList] = useState<Achievement[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [unseen, setUnseen] = useState<ReadonlySet<AchievementId>>(new Set());
  const [highlighted, setHighlighted] = useState<AchievementId | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    fetchAchievements(supabase, userId).then(
      (achievements) => {
        if (cancelled) return;
        const ids = achievements.filter((a) => a.earnedOn && a.seen === false).map((a) => a.id);
        setList(achievements);
        setUnseen(new Set(ids));
        markAchievementsSeen(supabase, ids).catch((error) => console.error("Failed to save seen achievements", error));
        if (isAchievementId(focus)) {
          // After the rows have rendered.
          setTimeout(() => !cancelled && highlight(focus), 120);
        }
      },
      (error) => {
        console.error("Failed to load achievements", error);
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
    // The focus is only for arriving from a link, so a change of it shouldn't refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!highlighted) return;
    const timer = setTimeout(() => setHighlighted(null), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [highlighted]);

  function highlight(id: AchievementId) {
    scrollToRow(id);
    setHighlighted(id);
  }

  if (failed) {
    return (
      <Shell>
        <Card className="mt-6 px-6 py-12 text-center sm:mt-8 sm:py-16" role="status">
          <p className="font-serif text-2xl font-semibold text-ink">We couldn&apos;t load your achievements.</p>
          <p className="mt-2 text-ink-secondary">Check your connection and refresh the page.</p>
        </Card>
      </Shell>
    );
  }
  if (!list) return <AchievementsSkeleton />;

  const isNew = (a: Achievement) => unseen.has(a.id) || (!!a.earnedOn && a.earnedOn === today);

  return (
    <Shell>
      <Summary achievements={list} onSelect={highlight} />

      <div className="mt-3 space-y-3 sm:mt-5 sm:space-y-5">
        {ACHIEVEMENT_GROUPS.map((group, g) => {
          const items = list.filter((a) => a.group === group.id);
          if (!items.length) return null;
          return (
            <Card
              key={group.id}
              className="stagger animate-rise px-5 pt-5 pb-2 sm:px-8 sm:pt-7 sm:pb-4"
              style={{ "--i": g + 1 } as CSSProperties}
            >
              <section aria-labelledby={`achievements-${group.id}`}>
                <div className="flex items-baseline justify-between px-1">
                  <h2 id={`achievements-${group.id}`} className="text-[15px] font-semibold text-ink sm:text-lg">
                    {group.label}
                  </h2>
                  <span className="text-xs tabular-nums text-ink-muted sm:text-sm">
                    {items.filter((a) => a.earnedOn).length} of {items.length}
                  </span>
                </div>
                <ul className="mt-2 grid divide-y divide-line sm:grid-cols-2 sm:gap-x-8 sm:divide-y-0">
                  {items.map((a, i) => (
                    <li key={a.id}>
                      <AchievementRow
                        achievement={a}
                        index={i}
                        fresh={isNew(a)}
                        celebrate={unseen.has(a.id)}
                        highlighted={highlighted === a.id}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            </Card>
          );
        })}
      </div>
    </Shell>
  );
}

/** The count, overall progress, latest medals and the one to go for next. */
function Summary({ achievements, onSelect }: { achievements: Achievement[]; onSelect: (id: AchievementId) => void }) {
  const earned = recentlyEarned(achievements);
  const next = nextUp(achievements);
  const latest = earned[0];

  return (
    <Card variant="challenge" className="mt-6 animate-rise px-6 py-6 sm:mt-8 sm:px-10 sm:py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Overline className="font-semibold text-brand-ink sm:text-xs">Earned</Overline>
          <p className="mt-1 font-serif font-semibold tracking-[-0.02em] text-ink">
            <span className="text-[44px] leading-none tabular-nums sm:text-[56px]">{earned.length}</span>
            <span className="ml-1.5 text-xl text-ink-muted sm:text-2xl">of {achievements.length}</span>
          </p>
        </div>
        {earned.length > 0 && (
          <span className="flex items-center pb-1" aria-hidden="true">
            {earned.slice(0, 4).map((a, i) => (
              <Medal
                key={a.id}
                achievement={a}
                size={40}
                className={cn("stagger animate-scale-in", i > 0 && "-ml-3 rounded-full ring-[3px] ring-brand-subtle")}
                style={{ zIndex: 4 - i, "--i": i } as CSSProperties}
              />
            ))}
          </span>
        )}
      </div>
      <ProgressBar progress={earned.length} target={achievements.length} tone="brand" className="mt-4" />

      <div className="mt-5 grid gap-2.5 sm:grid-cols-2 sm:gap-4">
        {latest && <SummaryRow label="Latest" achievement={latest} onSelect={onSelect} />}
        {next ? (
          <SummaryRow label="Next up" achievement={next} onSelect={onSelect} />
        ) : (
          <p className="self-center text-[15px] font-medium text-ink-secondary">Every one earned. Legendary!</p>
        )}
      </div>
    </Card>
  );
}

function SummaryRow({
  label,
  achievement,
  onSelect,
}: {
  label: string;
  achievement: Achievement;
  onSelect: (id: AchievementId) => void;
}) {
  const earned = achievement.earnedOn !== null;
  return (
    <button
      type="button"
      onClick={() => onSelect(achievement.id)}
      className="flex items-center gap-3 rounded-xl bg-surface/70 px-3.5 py-3 text-left transition-[background-color,scale] hover:bg-surface active:scale-[0.98]"
    >
      <Medal achievement={achievement} size={40} />
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">{label}</span>
        <span className="block truncate text-[15px] font-semibold text-ink">{achievement.title}</span>
        {earned ? (
          <span className="block text-[13px] text-ink-muted">{formatEarned(achievement.earnedOn!)}</span>
        ) : achievement.target > 1 ? (
          <span className="mt-1 flex items-center gap-2">
            <ProgressBar progress={achievement.progress} target={achievement.target} className="flex-1" />
            <span className="text-[12px] tabular-nums text-ink-muted">
              {achievement.progress.toLocaleString("en-US")}/{achievement.target.toLocaleString("en-US")}
            </span>
          </span>
        ) : (
          <span className="block truncate text-[13px] text-ink-muted">{achievement.description}</span>
        )}
      </span>
    </button>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[884px] px-4 pt-3 sm:px-8 sm:pt-12">
      <header className="text-center">
        <h1 className="font-serif text-[34px] font-semibold leading-[1.1] tracking-[-0.025em] text-ink sm:text-display">
          Your trophy case.
        </h1>
        <p className="mt-2 text-[15px] text-ink-secondary sm:mt-3 sm:text-[22px]">
          Medals for milestones, streaks, skill and speed.
        </p>
      </header>
      {children}
    </div>
  );
}

/** The Achievements tab before anything has loaded; also the route's loading fallback. */
export function AchievementsSkeleton() {
  return (
    <Shell>
      <div role="status" aria-busy="true">
        <span className="sr-only">Loading your achievements…</span>
        <Card variant="challenge" className="mt-6 px-6 py-6 sm:mt-8 sm:px-10 sm:py-8">
          <Skeleton tone="brand" className="h-3 w-16" />
          <Skeleton tone="brand" className="mt-3 h-11 w-36 sm:h-14" />
          <Skeleton tone="brand" className="mt-4 h-2 w-full" />
          <div className="mt-5 grid gap-2.5 sm:grid-cols-2 sm:gap-4">
            <Skeleton tone="brand" className="h-[66px] rounded-xl" />
            <Skeleton tone="brand" className="h-[66px] rounded-xl" />
          </div>
        </Card>
        {[0, 1].map((i) => (
          <Card key={i} className="mt-3 px-4 py-5 sm:mt-5 sm:px-8 sm:py-7">
            <Skeleton className="mx-1 h-4 w-24" />
            <div className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2">
              {Array.from({ length: 4 }, (_, j) => (
                <div key={j} className="flex items-center gap-3.5">
                  <Skeleton className="size-[52px] shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-full max-w-[220px]" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </Shell>
  );
}
