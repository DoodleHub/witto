"use client";

import { useMemo } from "react";
import { Overline } from "@/components/ui/overline";
import { getChallenge } from "@/lib/challenges";
import { formatLongDate } from "@/lib/date";
import { streakFor, useStore, useToday } from "@/lib/progress";
import { ChallengeCard, ChallengeCardSkeleton } from "./challenge-card";
import { StreakCard } from "./streak-card";
import { TomorrowStrip } from "./tomorrow-strip";

export function TodayView() {
  const today = useToday();
  const store = useStore();
  const challenge = useMemo(() => (today ? getChallenge(today) : null), [today]);
  const ready = today && store && challenge;

  return (
    <div className="mx-auto max-w-[884px] px-4 pt-3 sm:px-8 sm:pt-12">
      <header className="text-center">
        <h1 className="font-serif text-[34px] font-semibold leading-[1.1] tracking-[-0.025em] text-ink sm:text-display">
          <span className="sm:hidden">Your daily spark.</span>
          <span className="hidden sm:inline">A little challenge. A sharper you.</span>
        </h1>
        <p className="mt-2 text-[15px] text-ink-secondary sm:mt-3 sm:text-[26px]">One fresh puzzle, every day.</p>
        <Overline className="mt-5 min-h-[1.2em] sm:mt-10">{today ? formatLongDate(today) : " "}</Overline>
      </header>

      <div className="mt-4 space-y-3 sm:mt-6 sm:space-y-5">
        {ready ? (
          <ChallengeCard
            key={today}
            challenge={challenge}
            result={store.results[today]}
            hintUsed={!!store.hints[today]}
          />
        ) : (
          <ChallengeCardSkeleton />
        )}
        <div className="sm:px-1">
          <StreakCard
            today={ready ? today : null}
            streak={ready ? streakFor(store, today) : 0}
            playedDays={new Set(store ? Object.keys(store.results) : [])}
          />
        </div>
      </div>

      <div className="mt-8 sm:mt-10">
        <TomorrowStrip />
      </div>
    </div>
  );
}
