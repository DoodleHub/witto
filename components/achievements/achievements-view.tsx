"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Overline } from "@/components/ui/overline";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ACHIEVEMENT_GROUPS,
  fetchAchievements,
  isAchievementId,
  markAchievementsSeen,
  nextUp,
  recentlyEarned,
  type Achievement,
  type AchievementId,
} from "@/lib/achievements";
import { createClient } from "@/lib/supabase/client";
import { useToday } from "@/lib/today";
import { AchievementSheet, formatEarned } from "./achievements-sheet";
import { Medal, ProgressBar } from "./medal";

/**
 * The Achievements tab: a summary of how far the player has come, then every medal grouped by kind. Anything
 * earned that they haven't been shown yet spins in as it loads and is recorded as seen; it and anything earned
 * today keep a "New" tag for the visit. `focus` opens one achievement straight away (the unlock toast links here).
 */
export function AchievementsView({ userId, focus }: { userId: string; focus: string | null }) {
  const today = useToday();
  const [list, setList] = useState<Achievement[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [unseen, setUnseen] = useState<ReadonlySet<AchievementId>>(new Set());
  const [selected, setSelected] = useState<AchievementId | null>(isAchievementId(focus) ? focus : null);

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
      },
      (error) => {
        console.error("Failed to load achievements", error);
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [userId]);

  function close() {
    setSelected(null);
    // Drops the toast's ?a= so a refresh doesn't reopen it.
    if (focus) window.history.replaceState(null, "", "/achievements");
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
      <Summary achievements={list} onSelect={setSelected} />

      <div className="mt-3 space-y-3 sm:mt-5 sm:space-y-5">
        {ACHIEVEMENT_GROUPS.map((group, g) => {
          const items = list.filter((a) => a.group === group.id);
          if (!items.length) return null;
          return (
            <Card
              key={group.id}
              className="stagger animate-rise px-4 py-5 sm:px-8 sm:py-7"
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
                <ul className="mt-4 grid grid-cols-4 gap-x-1 gap-y-4 sm:grid-cols-6 sm:gap-y-6">
                  {items.map((a, i) => (
                    <li key={a.id}>
                      <MedalButton
                        achievement={a}
                        index={i}
                        fresh={isNew(a)}
                        celebrate={unseen.has(a.id)}
                        onClick={() => setSelected(a.id)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            </Card>
          );
        })}
      </div>

      <AchievementSheet achievement={list.find((a) => a.id === selected) ?? null} onClose={close} />
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

function MedalButton({
  achievement: a,
  index,
  fresh,
  celebrate,
  onClick,
}: {
  achievement: Achievement;
  index: number;
  fresh: boolean;
  celebrate: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full flex-col items-center gap-1.5 rounded-lg px-0.5 py-1 text-center outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)]"
    >
      <span className="relative transition-transform duration-200 ease-[var(--ease-spring)] group-hover:-translate-y-0.5 group-active:scale-95">
        <Medal
          achievement={a}
          size={60}
          celebrate={celebrate}
          className={celebrate ? undefined : "stagger animate-scale-in"}
          style={{ "--i": index } as CSSProperties}
        />
        {fresh && (
          <span className="absolute -right-2 -top-1 animate-scale-in rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-on-brand shadow-brand [animation-delay:600ms]">
            New
          </span>
        )}
      </span>
      <span className={cn("line-clamp-2 text-[12px] font-medium leading-tight sm:text-[13px]", a.earnedOn ? "text-ink" : "text-ink-muted")}>
        {a.title}
      </span>
      <span className="sr-only">
        {a.earnedOn ? `Earned ${formatEarned(a.earnedOn)}` : `Locked, ${a.progress} of ${a.target}`}
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
            <div className="mt-4 grid grid-cols-4 gap-y-4 sm:grid-cols-6">
              {Array.from({ length: 6 }, (_, j) => (
                <div key={j} className="flex flex-col items-center gap-2">
                  <Skeleton className="size-[60px] rounded-full" />
                  <Skeleton className="h-3 w-12" />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </Shell>
  );
}
