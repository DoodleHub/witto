"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { fetchChallenge, revealChallenge, type DailyChallenge, type SealedChallenge } from "@/lib/challenges";
import { refreshPlay, streakFor, useProgress } from "@/lib/progress";
import { useToday } from "@/lib/today";
import { createClient } from "@/lib/supabase/client";
import { ChallengeCard, ChallengeCardSkeleton } from "./challenge-card";
import { InviteStrip } from "./invite-strip";
import { NextChallengeCountdown } from "./next-challenge-countdown";
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

  // The play may have moved on in another tab or on another device while this one sat in the background.
  useEffect(() => {
    if (!today) return;
    const sync = () => {
      if (document.visibilityState !== "visible") return;
      void refreshPlay(today);
      fetchChallenge(createClient(), today).then(
        (challenge) => challenge && setLoaded((prev) => (prev?.dateKey === today ? { ...prev, challenge } : prev)),
        (error) => console.error("Failed to refresh today's challenge", error),
      );
    };
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [today]);

  /** Starts the clock: the server records the play and only then hands over the content. */
  async function reveal(dateKey: string) {
    const challenge = await revealChallenge(createClient(), dateKey);
    // Picks up the play as the server has it, which may already be underway or finished elsewhere.
    await refreshPlay(dateKey);
    setLoaded({ dateKey, challenge, error: false });
  }

  const current = loaded?.dateKey === today ? loaded : null;
  const ready = today && store && current;
  const failed = progressError || current?.error;
  const streak = store && today ? streakFor(store, today) : null;

  return (
    <TodayShell
      challenge={
        failed ? (
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
            streak={streak?.streak ?? 0}
            onReveal={reveal}
          />
        ) : (
          <Notice title="No puzzle for this day yet.">Check back soon for a fresh challenge.</Notice>
        )
      }
      streak={
        <StreakCard
          today={store && today ? today : null}
          streak={streak}
          playedDays={new Set(store ? Object.keys(store.results) : [])}
        />
      }
    />
  );
}

/** The Today page before anything has loaded; the route's loading fallback. */
export function TodaySkeleton() {
  return (
    <TodayShell
      challenge={<ChallengeCardSkeleton />}
      streak={<StreakCard today={null} streak={null} playedDays={new Set()} />}
    />
  );
}

function TodayShell({ challenge, streak }: { challenge: ReactNode; streak: ReactNode }) {
  return (
    <div className="mx-auto max-w-[884px] px-4 pt-3 sm:px-8 sm:pt-12">
      <header className="text-center">
        <h1 className="font-serif text-[34px] font-semibold leading-[1.1] tracking-[-0.025em] text-ink sm:text-display">
          <span className="sm:hidden">Your daily spark.</span>
          <span className="hidden sm:inline">A little challenge. A sharper you.</span>
        </h1>
        <p className="mt-2 text-[15px] text-ink-secondary sm:mt-3 sm:text-[26px]">One fresh puzzle, every day.</p>
        <NextChallengeCountdown />
      </header>

      <div className="mt-4 space-y-3 sm:mt-6 sm:space-y-5">
        {challenge}
        <div className="sm:px-1">{streak}</div>
      </div>

      <div className="mt-8 sm:mt-10">
        <TomorrowStrip />
      </div>

      <div className="mt-8 border-t border-line pt-6 sm:mt-10 sm:pt-8">
        <InviteStrip />
      </div>
    </div>
  );
}

function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card variant="challenge" className="px-6 py-12 text-center sm:px-12 sm:py-16" role="status">
      <p className="font-serif text-2xl font-semibold text-ink sm:text-[32px]">{title}</p>
      <p className="mt-2 text-ink-secondary sm:text-lg">{children}</p>
    </Card>
  );
}
