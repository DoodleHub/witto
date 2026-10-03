"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { CrownIcon, FlameIcon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/lib/date";
import { fetchBoard, toneFor, type Entry, type Period } from "@/lib/leaderboard";
import { useToday } from "@/lib/today";
import { createClient } from "@/lib/supabase/client";

const PERIODS: { id: Period; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "all", label: "All time" },
];

const TOP_ROWS = 10;

function formatValue(period: Period, value: number | null) {
  if (value === null) return "–";
  return period === "today" ? formatDuration(value) : `${value.toLocaleString("en-US")} pts`;
}

function formatSolved(solved: number) {
  return `${solved.toLocaleString("en-US")} ${solved === 1 ? "puzzle" : "puzzles"} solved`;
}

type Loaded = { key: string; entries: Entry[] | null };

export function LeaderboardView({ signedIn }: { signedIn: boolean }) {
  const today = useToday();
  const [period, setPeriod] = useState<Period>("today");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const key = today ? `${period}:${today}` : null;

  useEffect(() => {
    if (!today || !key) return;
    let cancelled = false;
    fetchBoard(createClient(), period, today, TOP_ROWS).then(
      (entries) => !cancelled && setLoaded({ key, entries }),
      (error) => {
        console.error("Failed to load the leaderboard", error);
        if (!cancelled) setLoaded({ key, entries: null });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key, period, today]);

  const current = loaded?.key === key ? loaded : null;
  const loading = !current;
  const failed = current?.entries === null;
  const entries = current?.entries ?? [];
  const ranked = entries.filter((e): e is Entry & { rank: number } => e.rank !== null);
  const you = signedIn ? (entries.find((e) => e.you) ?? null) : null;

  const podium = ranked.slice(0, 3);
  const rows = ranked.slice(3, TOP_ROWS);
  const youBelow = you && (you.rank === null || you.rank > TOP_ROWS);

  return (
    <div className="mx-auto max-w-[884px] px-4 pt-3 sm:px-8 sm:pt-12">
      <LeaderboardHeader />
      <PeriodTabs period={period} onChange={setPeriod} />

      {/* Podium: 2nd · 1st · 3rd */}
      <div className="mt-8 grid grid-cols-3 items-end gap-2.5 sm:mt-10 sm:gap-4">
        {[podium[1], podium[0], podium[2]].map((e, i) => {
          const first = i === 1;
          return (
            <PodiumCard key={e?.id ?? i} first={first} you={e?.you}>
              {e ? (
                <>
                  <div className="relative">
                    {first && <CrownIcon size={22} className="absolute -top-5 left-1/2 -translate-x-1/2 text-tile-present sm:-top-6 sm:size-6" />}
                    <Avatar name={e.name} you={e.you} tone={toneFor(e.id)} size={first ? 64 : 48} className={first ? "sm:size-20!" : "sm:size-14!"} />
                  </div>
                  <p className="mt-2 font-serif text-xl font-semibold text-ink sm:mt-3 sm:text-2xl">{e.rank}</p>
                  <p className="w-full truncate text-[13px] font-semibold text-ink sm:text-base">{e.name}</p>
                  <p className="hidden text-sm text-ink-muted sm:block">{formatSolved(e.solved)}</p>
                  <p className={cn("mt-1.5 text-sm font-semibold tabular-nums sm:mt-2 sm:text-base", first ? "text-brand-ink" : "text-ink-secondary")}>
                    {formatValue(period, e.value)}
                  </p>
                </>
              ) : loading ? (
                <PodiumSkeleton first={first} />
              ) : (
                <div className={cn("flex w-full flex-col items-center justify-center gap-2 text-ink-faint", first ? "h-40" : "h-32")}>
                  <span className="font-serif text-xl font-semibold sm:text-2xl">{[2, 1, 3][i]}</span>
                  <span className="text-[13px] sm:text-sm">Up for grabs</span>
                </div>
              )}
            </PodiumCard>
          );
        })}
      </div>

      <Card className="mt-3 overflow-hidden sm:mt-5">
        <TableHead period={period} />
        <ol aria-busy={loading}>
          {loading && <RowSkeletons />}
          {failed && (
            <li className="px-4 py-6 text-center text-[15px] text-ink-secondary sm:px-6" role="alert">
              We couldn&apos;t load the leaderboard. Refresh to try again.
            </li>
          )}
          {!loading && !failed && ranked.length === 0 && (
            <li className="border-b border-line px-4 py-6 text-center text-[15px] text-ink-secondary last:border-b-0 sm:px-6">
              {period === "today" ? "No one has solved today's puzzle yet." : "No solves yet this period."} Be the first!
            </li>
          )}
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
        Today ranks the fastest solves. Weekly and all-time rank points: up to 100 per puzzle, less for slower
        solves or a hint.
      </p>
    </div>
  );
}

/** The leaderboard before anything has loaded; the route's loading fallback. */
export function LeaderboardSkeleton() {
  return (
    <div className="mx-auto max-w-[884px] px-4 pt-3 sm:px-8 sm:pt-12" role="status" aria-busy="true">
      <span className="sr-only">Loading the leaderboard…</span>
      <LeaderboardHeader />
      <PeriodTabs period="today" />
      <div className="mt-8 grid grid-cols-3 items-end gap-2.5 sm:mt-10 sm:gap-4">
        {[false, true, false].map((first, i) => (
          <PodiumCard key={i} first={first}>
            <PodiumSkeleton first={first} />
          </PodiumCard>
        ))}
      </div>
      <Card className="mt-3 overflow-hidden sm:mt-5">
        <TableHead period="today" />
        <ol>
          <RowSkeletons />
        </ol>
      </Card>
    </div>
  );
}

function LeaderboardHeader() {
  return (
    <header className="text-center">
      <h1 className="font-serif text-[34px] font-semibold leading-[1.1] tracking-[-0.025em] text-ink sm:text-display">
        Who&apos;s sharpest today?
      </h1>
      <p className="mt-2 text-[15px] text-ink-secondary sm:mt-3 sm:text-[22px]">
        See how you stack up against fellow puzzlers.
      </p>
    </header>
  );
}

/** Without `onChange` the tabs are inert, as in the loading fallback. */
function PeriodTabs({ period, onChange }: { period: Period; onChange?: (period: Period) => void }) {
  return (
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
          disabled={!onChange}
          onClick={() => onChange?.(p.id)}
          className={cn(
            "h-9 rounded-full text-sm font-semibold transition-colors sm:h-10 sm:text-[15px]",
            period === p.id ? "bg-brand text-on-brand shadow-brand" : "text-ink-secondary enabled:hover:text-ink",
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function PodiumCard({ first, you, children }: { first: boolean; you?: boolean; children: ReactNode }) {
  return (
    <Card
      variant={first ? "challenge" : "surface"}
      className={cn(
        "flex flex-col items-center px-2 text-center",
        first ? "pb-5 pt-5 sm:pb-8 sm:pt-7" : "pb-4 pt-4 sm:pb-6 sm:pt-6",
        you && "ring-2 ring-brand",
      )}
    >
      {children}
    </Card>
  );
}

function PodiumSkeleton({ first }: { first: boolean }) {
  const tone = first ? "brand" : "track";
  return (
    <div className={cn("flex w-full flex-col items-center justify-center", first ? "min-h-40" : "min-h-32")}>
      <Skeleton tone={tone} className={cn("rounded-full", first ? "size-16 sm:size-20" : "size-12 sm:size-14")} />
      <Skeleton tone={tone} className="mt-3 h-5 w-6 sm:mt-4 sm:h-6" />
      <Skeleton tone={tone} className="mt-2 h-4 w-3/4 max-w-28" />
      <Skeleton tone={tone} className="mt-2.5 h-4 w-1/2 max-w-16" />
    </div>
  );
}

function TableHead({ period }: { period: Period }) {
  return (
    <div className="hidden grid-cols-[56px_1fr_110px_110px] border-b border-line px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted sm:grid">
      <span>Rank</span>
      <span>Player</span>
      <span className="text-right">Streak</span>
      <span className="text-right">{period === "today" ? "Time" : "Points"}</span>
    </div>
  );
}

/** Placeholder rows shaped like `Row`. */
function RowSkeletons({ count = 5 }: { count?: number }) {
  return Array.from({ length: count }, (_, i) => (
    <li
      key={i}
      aria-hidden="true"
      className="grid grid-cols-[36px_1fr_auto] items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 sm:grid-cols-[56px_1fr_110px_110px] sm:gap-0 sm:px-6 sm:py-3.5"
    >
      <Skeleton className="h-4 w-4" />
      <span className="flex min-w-0 items-center gap-3">
        <Skeleton className="size-9 shrink-0 rounded-full" />
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Skeleton className="h-4 w-32 max-w-full" />
          <Skeleton className="h-3 w-24 max-w-full" />
        </span>
      </span>
      <Skeleton className="ml-auto hidden h-4 w-8 sm:block" />
      <Skeleton className="ml-auto h-4 w-14" />
    </li>
  ));
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
        <Avatar name={entry.name} you={entry.you} tone={toneFor(entry.id)} size={36} />
        <span className="min-w-0">
          <span className="block truncate font-semibold text-ink">
            {entry.name}
            {entry.you && <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-ink">You</span>}
          </span>
          <span className="flex items-center gap-1 text-[13px] text-ink-muted">
            <span className="sm:hidden">
              <FlameIcon size={13} className="-mt-0.5 inline" /> {entry.streak} ·
            </span>
            {formatSolved(entry.solved)}
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
