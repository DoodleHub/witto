"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/components/ui/cn";
import { FlameIcon, LightbulbIcon, TYPE_ICONS } from "@/components/ui/icons";
import { Overline } from "@/components/ui/overline";
import { Sheet, SheetClose } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { CHALLENGE_TYPES, TYPE_META } from "@/lib/challenges";
import { formatDuration, fromDateKey } from "@/lib/date";
import { fetchPlayerProfile, toneFor, type Entry, type PlayerProfile } from "@/lib/leaderboard";
import { createClient } from "@/lib/supabase/client";

/** Loaded profiles by `id:day`; "error" when the fetch failed. */
type Profiles = Record<string, PlayerProfile | null | "error">;

function formatDay(key: string, withYear = false) {
  return fromDateKey(key).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(withYear && { year: "numeric" }),
  });
}

function plural(n: number, word: string) {
  return `${n.toLocaleString("en-US")} ${n === 1 ? word : `${word}s`}`;
}

/**
 * A player's record, opened from the leaderboard or the account menu: a bottom sheet on phones and a centred dialog on wider screens.
 * The caller supplies the name straight away, and the rest loads behind it.
 */
export function PlayerSheet({
  player,
  today,
  onClose,
}: {
  player: Pick<Entry, "id" | "name" | "you"> | null;
  today: string | null;
  onClose: () => void;
}) {
  const [profiles, setProfiles] = useState<Profiles>({});
  const key = player && today ? `${player.id}:${today}` : null;

  useEffect(() => {
    if (!player || !today || !key || key in profiles) return;
    let cancelled = false;
    fetchPlayerProfile(createClient(), player.id, today).then(
      (profile) => !cancelled && setProfiles((p) => ({ ...p, [key]: profile })),
      (error) => {
        console.error("Failed to load the player", error);
        if (!cancelled) setProfiles((p) => ({ ...p, [key]: "error" }));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [player, today, key, profiles]);

  const profile = key ? profiles[key] : undefined;

  return (
    // Keyed on `player !== null` rather than on `player`, so a leaderboard refresh behind the sheet doesn't reopen it.
    <Sheet open={player !== null} onClose={onClose} labelledBy="player-sheet-name">
      {player && (
        <div className="px-5 pt-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:px-7 sm:pt-7 sm:pb-7">
          <div className="flex items-start gap-4">
            <Avatar name={player.name} you={player.you} tone={toneFor(player.id)} size={56} />
            <div className="min-w-0 flex-1 pt-1">
              <h2 id="player-sheet-name" className="truncate font-serif text-2xl font-semibold tracking-[-0.015em] text-ink">
                {player.name}
              </h2>
              <div className="mt-0.5 text-sm text-ink-muted">
                {player.you && <span className="font-semibold text-brand-ink">You · </span>}
                {profile && profile !== "error" ? (
                  `Playing since ${formatDay(profile.joined_on, true)}`
                ) : (
                  <Skeleton className="inline-block h-[0.8em] w-36 align-middle" />
                )}
              </div>
            </div>
            <SheetClose onClick={onClose} className="-mr-2 -mt-1" />
          </div>

          {profile === "error" || profile === null ? (
            <p className="mt-6 text-center text-[15px] text-ink-secondary" role="alert">
              We couldn&apos;t load this player. Try again later.
            </p>
          ) : (
            <ProfileBody profile={profile} />
          )}
        </div>
      )}
    </Sheet>
  );
}

/** Everything below the header; `undefined` while it loads. */
function ProfileBody({ profile }: { profile: PlayerProfile | undefined }) {
  const loading = !profile;
  const types = new Map(profile?.types.map((t) => [t.type, t]));

  return (
    <div aria-busy={loading}>
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <Stat
          label="Streak"
          value={
            profile && (
              <span className="flex items-center gap-1">
                <FlameIcon size={20} />
                {profile.streak}
              </span>
            )
          }
          note={profile && `Best ${plural(profile.best_streak, "day")}`}
        />
        <Stat label="Solved" value={profile?.solved.toLocaleString("en-US")} note={profile && `of ${profile.played} played`} />
        <Stat label="Points" value={profile?.points.toLocaleString("en-US")} note={profile && "All time"} />
        <Stat
          label="Fastest"
          value={profile && (profile.fastest_ms === null ? "–" : formatDuration(profile.fastest_ms))}
          note={profile && (profile.hints ? `${plural(profile.hints, "hint")} taken` : "No hints taken")}
        />
      </div>

      <Overline className="mt-6 sm:text-xs">By puzzle type</Overline>
      <ul className="mt-2 divide-y divide-line">
        {CHALLENGE_TYPES.map((type) => {
          const Icon = TYPE_ICONS[type];
          const t = types.get(type);
          return (
            <li key={type} className="flex items-center gap-3 py-2.5">
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full",
                  t?.solved ? "bg-brand-soft text-brand-ink" : "bg-surface-muted text-ink-faint",
                )}
              >
                <Icon size={20} />
              </span>
              <span className={cn("flex-1 text-[15px] font-medium", t ? "text-ink" : "text-ink-muted")}>{TYPE_META[type].label}</span>
              {loading ? (
                <Skeleton className="h-4 w-20" />
              ) : t ? (
                <span className="text-right text-sm tabular-nums">
                  <span className="font-semibold text-ink">
                    {t.solved}/{t.played}
                  </span>
                  <span className="text-ink-muted"> solved</span>
                  {t.best_ms !== null && <span className="block text-[13px] text-ink-muted">Best {formatDuration(t.best_ms)}</span>}
                </span>
              ) : (
                <span className="text-sm text-ink-faint">Not yet</span>
              )}
            </li>
          );
        })}
      </ul>

      <Overline className="mt-6 sm:text-xs">Recent puzzles</Overline>
      {loading ? (
        <div className="mt-3 space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : profile.recent.length === 0 ? (
        <p className="mt-2 text-[15px] text-ink-secondary">No puzzles finished yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {profile.recent.map((play) => {
            const Icon = TYPE_ICONS[play.type];
            const solved = play.status === "solved";
            return (
              <li key={play.day} className="flex items-center gap-3 py-2.5">
                <Icon size={20} className="shrink-0 text-ink-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-ink">
                    {TYPE_META[play.type].label}
                  </span>
                  <span className="block text-[13px] text-ink-muted">{formatDay(play.day)}</span>
                </span>
                {play.hint_used && (
                  <span className="shrink-0 text-ink-muted" title="Hint taken">
                    <LightbulbIcon size={16} />
                    <span className="sr-only">Hint taken</span>
                  </span>
                )}
                <span className="text-right text-sm tabular-nums">
                  {solved ? (
                    <>
                      <span className="block font-semibold text-ink">{formatDuration(play.time_ms)}</span>
                      <span className="block text-[13px] text-ink-muted">{play.points} pts</span>
                    </>
                  ) : (
                    <span className="font-semibold text-danger">Missed</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: ReactNode; note: ReactNode }) {
  return (
    <div className="rounded-lg bg-surface-muted px-3.5 py-3">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-ink-muted">{label}</p>
      <div className="mt-1 font-serif text-2xl font-semibold tabular-nums text-ink">
        {value ?? <Skeleton className="inline-block h-[0.8em] w-12 align-middle" />}
      </div>
      <div className="text-[13px] text-ink-muted">{note ?? <Skeleton className="inline-block h-[0.8em] w-20 align-middle" />}</div>
    </div>
  );
}
