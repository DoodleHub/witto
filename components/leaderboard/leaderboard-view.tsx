"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { CheckIcon, CrownIcon, FlameIcon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/lib/date";
import { fetchBoard, toneFor, type Entry, type Period } from "@/lib/leaderboard";
import { useToday } from "@/lib/today";
import { createClient } from "@/lib/supabase/client";
import { PlayerSheet } from "./player-sheet";

const PERIODS: { id: Period; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
];

const TOP_ROWS = 10;

function formatValue(period: Period, value: number | null) {
  if (value === null) return "–";
  return period === "today" ? formatDuration(value) : `${value.toLocaleString("en-US")} pts`;
}

function formatSolved(solved: number) {
  return `${solved.toLocaleString("en-US")} ${solved === 1 ? "puzzle" : "puzzles"} solved`;
}

/** Loaded boards by `period:day`; null when the fetch failed. */
type Boards = Record<string, Entry[] | null>;

export function LeaderboardView({ signedIn }: { signedIn: boolean }) {
  const today = useToday();
  const [period, setPeriod] = useState<Period>("today");
  const [boards, setBoards] = useState<Boards>({});
  // The period on screen: it lags `period` while a newly picked board is still loading, so the old one stays up
  // instead of flashing back to skeletons.
  const [shownPeriod, setShownPeriod] = useState<Period>(period);
  const [selected, setSelected] = useState<Entry | null>(null);
  if (shownPeriod !== period && today && `${period}:${today}` in boards) setShownPeriod(period);

  // Load every period up front so switching tabs is instant.
  useEffect(() => {
    if (!today) return;
    let cancelled = false;
    const supabase = createClient();
    for (const { id } of PERIODS) {
      const save = (entries: Entry[] | null) => !cancelled && setBoards((b) => ({ ...b, [`${id}:${today}`]: entries }));
      fetchBoard(supabase, id, today, TOP_ROWS).then(save, (error) => {
        console.error("Failed to load the leaderboard", error);
        save(null);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [today]);

  const shownKey = today ? `${shownPeriod}:${today}` : null;
  const loading = !shownKey || !(shownKey in boards);
  const switching = shownPeriod !== period;
  const failed = !loading && boards[shownKey] === null;
  const entries = (shownKey && boards[shownKey]) || [];
  const ranked = entries.filter((e): e is Entry & { rank: number } => e.rank !== null);
  const you = signedIn ? (entries.find((e) => e.you) ?? null) : null;

  const podium = ranked.slice(0, 3);
  const rows = ranked.slice(3, TOP_ROWS);
  const youBelow = you && (you.rank === null || you.rank > TOP_ROWS);

  return (
    <div className="mx-auto max-w-[884px] px-4 pt-3 sm:px-8 sm:pt-12">
      <LeaderboardHeader />
      <PeriodTabs period={period} onChange={setPeriod} />

      <div aria-busy={loading || switching} className={cn("transition-opacity duration-200", switching && "opacity-60")}>
        {/* Podium: 2nd · 1st · 3rd */}
        <div className="mt-8 grid grid-cols-3 items-end gap-2.5 sm:mt-10 sm:gap-4">
          {[podium[1], podium[0], podium[2]].map((e, i) => {
            const first = i === 1;
            return (
              <PodiumCard key={e?.id ?? i} first={first} you={e?.you} interactive={!!e} order={[1, 0, 2][i]}>
                {e ? (
                  <>
                    <div className="relative">
                      {first && <CrownIcon size={22} className="absolute -top-5 left-1/2 -translate-x-1/2 text-tile-present sm:-top-6 sm:size-6" />}
                      <Avatar name={e.name} you={e.you} tone={toneFor(e.id)} size={first ? 64 : 48} className={first ? "sm:size-20!" : "sm:size-14!"} />
                    </div>
                    <p className="mt-2 font-serif text-xl font-semibold text-ink sm:mt-3 sm:text-2xl">{e.rank}</p>
                    <p className="w-full truncate text-[13px] font-semibold text-ink sm:text-base">
                      <PlayerButton name={e.name} onClick={() => setSelected(e)} />
                    </p>
                    <PodiumStats streak={e.streak} solved={e.solved} />
                    <p className={cn("mt-1.5 text-sm font-semibold tabular-nums sm:mt-2 sm:text-base", first ? "text-brand-ink" : "text-ink-secondary")}>
                      {formatValue(shownPeriod, e.value)}
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
          <TableHead period={shownPeriod} />
          <ol>
            {loading && <RowSkeletons />}
            {failed && (
              <li className="px-4 py-6 text-center text-[15px] text-ink-secondary sm:px-6" role="alert">
                We couldn&apos;t load the leaderboard. Refresh to try again.
              </li>
            )}
            {!loading && !failed && ranked.length === 0 && (
              <li className="border-b border-line px-4 py-6 text-center text-[15px] text-ink-secondary last:border-b-0 sm:px-6">
                {shownPeriod === "today" ? "No one has solved today's puzzle yet." : "No solves yet this period."} Be the first!
              </li>
            )}
            {rows.map((e, i) => (
              <Row key={e.id} entry={e} rank={e.rank} period={shownPeriod} order={i + 3} onOpen={() => setSelected(e)} />
            ))}
            {youBelow && you && (
              <>
                {you.rank !== null && (
                  <li aria-hidden="true" className="py-1 text-center text-ink-faint">
                    ⋯
                  </li>
                )}
                <Row entry={you} rank={you.rank} period={shownPeriod} order={TOP_ROWS} onOpen={() => setSelected(you)} />
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
      </div>

      <p className="mt-5 text-center text-sm text-ink-muted">
        Today ranks the fastest solves. Weekly and monthly rank points: up to 100 per puzzle, less for slower
        solves or a hint. Tap a player to see their record.
      </p>

      <PlayerSheet player={selected} today={today} onClose={() => setSelected(null)} />
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
      className="relative mx-auto mt-6 grid max-w-[420px] grid-cols-3 rounded-full border border-line bg-surface p-1 shadow-sm sm:mt-8"
    >
      {/* One pill slides under the selected tab, rather than each tab swapping its own background. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-full bg-brand shadow-brand transition-transform duration-300 ease-[var(--ease-out-quint)]"
        style={{ transform: `translateX(${PERIODS.findIndex((p) => p.id === period) * 100}%)` }}
      />
      {PERIODS.map((p) => (
        <button
          key={p.id}
          role="tab"
          aria-selected={period === p.id}
          disabled={!onChange}
          onClick={() => onChange?.(p.id)}
          className={cn(
            "relative h-9 rounded-full text-sm font-semibold transition-colors duration-300 sm:h-10 sm:text-[15px]",
            period === p.id ? "text-on-brand" : "text-ink-secondary enabled:hover:text-ink",
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function PodiumCard({
  first,
  you,
  interactive,
  order = 0,
  children,
}: {
  first: boolean;
  you?: boolean;
  interactive?: boolean;
  /** Where it comes in the entrance: first place lands before second and third. */
  order?: number;
  children: ReactNode;
}) {
  return (
    <Card
      variant={first ? "challenge" : "surface"}
      style={{ "--i": order * 2 } as CSSProperties}
      className={cn(
        "relative flex flex-col items-center px-2 text-center",
        interactive &&
          "stagger animate-rise transition-transform has-[button:active]:scale-[0.98] has-[button:focus-visible]:ring-4 has-[button:focus-visible]:ring-[var(--focus-ring)]",
        first ? "pb-5 pt-5 sm:pb-8 sm:pt-7" : "pb-4 pt-4 sm:pb-6 sm:pt-6",
        you && "ring-2 ring-brand",
      )}
    >
      {children}
    </Card>
  );
}

/** Streak and solve count, squeezed to icons on phones where the podium cards are only a third of the screen wide. */
function PodiumStats({ streak, solved }: { streak: number; solved: number }) {
  return (
    <p className="mt-0.5 flex items-center justify-center gap-1.5 text-[13px] tabular-nums text-ink-muted sm:text-sm">
      <span className="flex items-center gap-0.5">
        <FlameIcon size={14} className="sm:size-4" />
        {streak}
        <span className="sr-only"> day streak</span>
      </span>
      <span aria-hidden="true">·</span>
      <span className="flex items-center gap-0.5">
        <CheckIcon size={13} className="sm:hidden" />
        {solved.toLocaleString("en-US")}
        <span className="max-sm:sr-only">&nbsp;solved</span>
      </span>
    </p>
  );
}

/** Shaped line for line like a filled podium card, so nothing shifts when the data lands. */
function PodiumSkeleton({ first }: { first: boolean }) {
  const tone = first ? "brand" : "track";
  return (
    <>
      <Skeleton tone={tone} className={cn("rounded-full", first ? "size-16 sm:size-20" : "size-12 sm:size-14")} />
      <div className="mt-2 font-serif text-xl sm:mt-3 sm:text-2xl">
        <Skeleton tone={tone} className="inline-block h-[0.8em] w-6 align-middle" />
      </div>
      <div className="w-full text-[13px] sm:text-base">
        <Skeleton tone={tone} className="inline-block h-[0.8em] w-3/4 max-w-28 align-middle" />
      </div>
      <div className="mt-0.5 text-[13px] sm:text-sm">
        <Skeleton tone={tone} className="inline-block h-[0.8em] w-2/3 max-w-32 align-middle" />
      </div>
      <div className="mt-1.5 text-sm sm:mt-2 sm:text-base">
        <Skeleton tone={tone} className="inline-block h-[0.8em] w-16 align-middle" />
      </div>
    </>
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

/** Placeholder rows shaped like `Row`, one per row below the podium. */
function RowSkeletons({ count = TOP_ROWS - 3 }: { count?: number }) {
  return Array.from({ length: count }, (_, i) => (
    <li
      key={i}
      aria-hidden="true"
      className="grid grid-cols-[36px_1fr_auto] items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 sm:grid-cols-[56px_1fr_110px_110px] sm:gap-0 sm:px-6 sm:py-3.5"
    >
      <Skeleton className="h-4 w-4" />
      <span className="flex min-w-0 items-center gap-3">
        <Skeleton className="size-9 shrink-0 rounded-full" />
        <span className="min-w-0 flex-1">
          <span className="block">
            <Skeleton className="inline-block h-[0.8em] w-32 max-w-full align-middle" />
          </span>
          <span className="block text-[13px]">
            <Skeleton className="inline-block h-[0.8em] w-24 max-w-full align-middle" />
          </span>
        </span>
      </span>
      <Skeleton className="ml-auto hidden h-4 w-8 sm:block" />
      <Skeleton className="ml-auto h-4 w-14" />
    </li>
  ));
}

/**
 * The player's name as a button whose hit area stretches over the nearest positioned ancestor, so the whole
 * row or podium card opens their record while the markup stays a list.
 */
function PlayerButton({ name, onClick }: { name: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      className="max-w-full truncate outline-none after:absolute after:inset-0 after:content-['']"
    >
      {name}
    </button>
  );
}

function Row({
  entry,
  rank,
  period,
  order = 0,
  onOpen,
}: {
  entry: Entry;
  rank: number | null;
  period: Period;
  /** Its place in the board's staggered entrance. */
  order?: number;
  onOpen: () => void;
}) {
  const notPlayed = entry.you && rank === null;
  return (
    <li
      style={{ "--i": order } as CSSProperties}
      className={cn(
        "stagger relative grid animate-rise transition-colors hover:bg-surface-muted has-[button:focus-visible]:bg-surface-muted grid-cols-[36px_1fr_auto] items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 sm:grid-cols-[56px_1fr_110px_110px] sm:gap-0 sm:px-6 sm:py-3.5",
        entry.you && "bg-brand-subtle",
      )}
    >
      <span className="text-[15px] font-semibold tabular-nums text-ink-secondary">{rank ?? "–"}</span>
      <span className="flex min-w-0 items-center gap-3">
        <Avatar name={entry.name} you={entry.you} tone={toneFor(entry.id)} size={36} />
        <span className="min-w-0">
          <span className="flex min-w-0 items-center font-semibold text-ink">
            <PlayerButton name={entry.name} onClick={onOpen} />
            {entry.you && <span className="ml-2 shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-ink">You</span>}
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
          <Link href="/" className="relative z-10 text-brand-ink hover:underline">
            Play now →
          </Link>
        ) : (
          formatValue(period, entry.value)
        )}
      </span>
    </li>
  );
}
