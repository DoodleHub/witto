"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Overline } from "@/components/ui/overline";
import { fetchChallenge, revealChallenge, type DailyChallenge, type SealedChallenge } from "@/lib/challenges";
import { formatLongDate } from "@/lib/date";
import { markStarted, streakFor, useProgress } from "@/lib/progress";
import { useToday } from "@/lib/today";
import { createClient } from "@/lib/supabase/client";
import { ChallengeCard, ChallengeCardSkeleton } from "./challenge-card";
import { StreakCard } from "./streak-card";
import { TomorrowStrip } from "./tomorrow-strip";

type Loaded = { dateKey: string; challenge: DailyChallenge | SealedChallenge | null; error: boolean };

export function TodayView({ userId }: { userId: string }) {
  const today = useToday();
  const { store, error: progressError } = useProgress(userId);
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!today) return;
    let cancelled = false;
    fetchChallenge(createClient(), today).then(
      (challenge) => !cancelled && setLoaded({ dateKey: today, challenge, error: false }),
      (error) => {
        console.error("Failed to load today's challenge", error);
        if (!cancelled) setLoaded({ dateKey: today, challenge: null, error: true });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [today]);

  /** Starts the clock: the server records the play and only then hands over the content. */
  async function reveal(dateKey: string) {
    const challenge = await revealChallenge(createClient(), dateKey);
    markStarted(dateKey);
    setLoaded({ dateKey, challenge, error: false });
  }

  const current = loaded?.dateKey === today ? loaded : null;
  const ready = today && store && current;
  const failed = progressError || current?.error;

  return (
    <div className="mx-auto max-w-[884px] px-4 pt-3 sm:px-8 sm:pt-12">
      <header className="text-center">
        <h1 className="font-serif text-[34px] font-semibold leading-[1.1] tracking-[-0.025em] text-ink sm:text-display">
          <span className="sm:hidden">Your daily spark.</span>
          <span className="hidden sm:inline">A little challenge. A sharper you.</span>
        </h1>
        <p className="mt-2 text-[15px] text-ink-secondary sm:mt-3 sm:text-[26px]">One fresh puzzle, every day.</p>
        <Overline className="mt-5 min-h-[1.2em] sm:mt-10">{today ? formatLongDate(today) : " "}</Overline>
      </header>

      <div className="mt-4 space-y-3 sm:mt-6 sm:space-y-5">
        {failed ? (
          <Notice title="We couldn't load today's puzzle.">Check your connection and refresh the page.</Notice>
        ) : !ready ? (
          <ChallengeCardSkeleton />
        ) : current.challenge ? (
          <ChallengeCard
            key={today}
            challenge={current.challenge}
            play={store.states[today]}
            result={store.results[today]}
            hintUsed={!!store.hints[today]}
            onReveal={reveal}
          />
        ) : (
          <Notice title="No puzzle for this day yet.">Check back soon for a fresh challenge.</Notice>
        )}
        <div className="sm:px-1">
          <StreakCard
            today={store && today ? today : null}
            streak={store && today ? streakFor(store, today) : 0}
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

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card variant="challenge" className="px-6 py-12 text-center sm:px-12 sm:py-16" role="status">
      <p className="font-serif text-2xl font-semibold text-ink sm:text-[32px]">{title}</p>
      <p className="mt-2 text-ink-secondary sm:text-lg">{children}</p>
    </Card>
  );
}
