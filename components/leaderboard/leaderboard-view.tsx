"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";
import { CrownIcon, FlameIcon } from "@/components/ui/icons";
import { formatDuration, weekOf } from "@/lib/date";
import { mockBoard, pointsFor, type Entry, type Period } from "@/lib/leaderboard";
import { streakFor, useStore, useToday } from "@/lib/progress";

const PERIODS: { id: Period; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "all", label: "All time" },
];

const TOP_ROWS = 10;

function formatValue(period: Period, value: number) {
  return period === "today" ? formatDuration(value) : `${value.toLocaleString("en-US")} pts`;
}

export function LeaderboardView({ signedIn }: { signedIn: boolean }) {
  const today = useToday();
  const store = useStore();
  const [period, setPeriod] = useState<Period>("today");

  let ranked: (Entry & { rank: number })[] = [];
  let you: (Entry & { rank: number | null }) | null = null;

  if (today && store) {
    const board = mockBoard(period, today);
    const results = store.results;
    const week = new Set(weekOf(today));
    const mine = Object.entries(results).filter(([day, r]) => r.status === "solved" && (period !== "week" || week.has(day)));
    const todays = results[today];
    const value =
      period === "today"
        ? todays?.status === "solved"
          ? todays.timeMs
          : null
        : mine.reduce((sum, [, r]) => sum + pointsFor(r.timeMs, r.hintUsed), 0);

    const youEntry: Entry = { id: "you", name: "You", place: "Your device", streak: streakFor(store, today), value: value ?? 0, you: true };
    // Signed-out visitors only see the board; their local progress isn't theirs to rank.
    const all = value === null || !signedIn ? board : [...board, youEntry].sort((a, b) => (period === "today" ? a.value - b.value : b.value - a.value));
    ranked = all.map((e, i) => ({ ...e, rank: i + 1 }));
    if (signedIn) you = ranked.find((e) => e.you) ?? { ...youEntry, rank: null };
  }

  const podium = ranked.slice(0, 3);
  const rows = ranked.slice(3, TOP_ROWS);
  const youBelow = you && (you.rank === null || you.rank > TOP_ROWS);

  return (
    <div className="mx-auto max-w-[884px] px-4 pt-3 sm:px-8 sm:pt-12">
      <header className="text-center">
        <h1 className="font-serif text-[34px] font-semibold leading-[1.1] tracking-[-0.025em] text-ink sm:text-display">
          Who&apos;s sharpest today?
        </h1>
        <p className="mt-2 text-[15px] text-ink-secondary sm:mt-3 sm:text-[22px]">
          See how you stack up against fellow puzzlers.
        </p>
        <div className="mt-5 flex justify-center sm:mt-8">
          <Chip tone="neutral">Preview · sample players</Chip>
        </div>
      </header>

      <div
        role="tablist"
        aria-label="Leaderboard period"
        className="mx-auto mt-6 grid max-w-[420px] grid-cols-3 rounded-full border border-line bg-surface p-1 shadow-sm sm:mt-8"
      >
        {PERIODS.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={period === p.id}
            onClick={() => setPeriod(p.id)}
            className={cn(
              "h-9 rounded-full text-sm font-semibold transition-colors sm:h-10 sm:text-[15px]",
              period === p.id ? "bg-brand text-on-brand shadow-brand" : "text-ink-secondary hover:text-ink",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Podium: 2nd · 1st · 3rd */}
      <div className="mt-8 grid grid-cols-3 items-end gap-2.5 sm:mt-10 sm:gap-4">
        {(podium.length ? [podium[1], podium[0], podium[2]] : [null, null, null]).map((e, i) => {
          const first = i === 1;
          return (
            <Card
              key={e?.id ?? i}
              variant={first ? "challenge" : "surface"}
              className={cn(
                "flex flex-col items-center px-2 text-center",
                first ? "pb-5 pt-5 sm:pb-8 sm:pt-7" : "pb-4 pt-4 sm:pb-6 sm:pt-6",
                e?.you && "ring-2 ring-brand",
              )}
            >
              {e ? (
                <>
                  <div className="relative">
                    {first && <CrownIcon size={22} className="absolute -top-5 left-1/2 -translate-x-1/2 text-tile-present sm:-top-6 sm:size-6" />}
                    <Avatar name={e.name} you={e.you} tone={Number(e.id.slice(1))} size={first ? 64 : 48} className={first ? "sm:size-20!" : "sm:size-14!"} />
                  </div>
                  <p className="mt-2 font-serif text-xl font-semibold text-ink sm:mt-3 sm:text-2xl">{e.rank}</p>
                  <p className="w-full truncate text-[13px] font-semibold text-ink sm:text-base">{e.name}</p>
                  <p className="hidden text-sm text-ink-muted sm:block">{e.place}</p>
                  <p className={cn("mt-1.5 text-sm font-semibold tabular-nums sm:mt-2 sm:text-base", first ? "text-brand-ink" : "text-ink-secondary")}>
                    {formatValue(period, e.value)}
                  </p>
                </>
              ) : (
                <div className={cn("w-full animate-pulse", first ? "h-40" : "h-32")} />
              )}
            </Card>
          );
        })}
      </div>

      <Card className="mt-3 overflow-hidden sm:mt-5">
        <div className="hidden grid-cols-[56px_1fr_110px_110px] border-b border-line px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted sm:grid">
          <span>Rank</span>
          <span>Player</span>
          <span className="text-right">Streak</span>
          <span className="text-right">{period === "today" ? "Time" : "Points"}</span>
        </div>
        <ol>
          {rows.map((e) => (
            <Row key={e.id} entry={e} rank={e.rank} period={period} />
          ))}
          {youBelow && you && (
            <>
              {you.rank !== null && (
                <li aria-hidden="true" className="py-1 text-center text-ink-faint">
                  ⋯
                </li>
              )}
              <Row entry={you} rank={you.rank} period={period} />
            </>
          )}
          {!signedIn && (
            <li className="bg-brand-subtle px-4 py-3.5 text-center text-[15px] text-ink-secondary sm:px-6">
              <Link href="/login?next=%2Fleaderboard" className="font-semibold text-brand-ink hover:underline">
                Sign in
              </Link>{" "}
              to play today&apos;s puzzle and claim your spot.
            </li>
          )}
        </ol>
      </Card>

      <p className="mt-5 text-center text-sm text-ink-muted">
        These are sample players. Real rankings arrive once Witto has a community.
      </p>
    </div>
  );
}

function Row({ entry, rank, period }: { entry: Entry; rank: number | null; period: Period }) {
  const notPlayed = entry.you && rank === null;
  return (
    <li
      className={cn(
        "grid grid-cols-[36px_1fr_auto] items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 sm:grid-cols-[56px_1fr_110px_110px] sm:gap-0 sm:px-6 sm:py-3.5",
        entry.you && "bg-brand-subtle",
      )}
    >
      <span className="text-[15px] font-semibold tabular-nums text-ink-secondary">{rank ?? "–"}</span>
      <span className="flex min-w-0 items-center gap-3">
        <Avatar name={entry.name} you={entry.you} tone={entry.you ? 0 : Number(entry.id.slice(1))} size={36} />
        <span className="min-w-0">
          <span className="block truncate font-semibold text-ink">
            {entry.name}
            {entry.you && <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-ink">You</span>}
          </span>
          <span className="flex items-center gap-1 text-[13px] text-ink-muted">
            <span className="sm:hidden">
              <FlameIcon size={13} className="-mt-0.5 inline" /> {entry.streak} ·
            </span>
            {entry.place}
          </span>
        </span>
      </span>
      <span className="hidden items-center justify-end gap-1.5 text-[15px] tabular-nums text-ink-secondary sm:flex">
        <FlameIcon size={16} />
        {entry.streak}
      </span>
      <span className="text-right text-[15px] font-semibold tabular-nums text-ink">
        {notPlayed ? (
          <Link href="/" className="text-brand-ink hover:underline">
            Play now →
          </Link>
        ) : (
          formatValue(period, entry.value)
        )}
      </span>
    </li>
  );
}
