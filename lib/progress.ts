import { useCallback, useEffect, useSyncExternalStore } from "react";
import { createClient } from "./supabase/client";
import type { Json } from "./supabase/database.types";
import { addDays } from "./date";

export type DayResult = {
  status: "solved" | "failed";
  timeMs: number;
  hintUsed: boolean;
};

export type Store = {
  results: Record<string, DayResult>;
  games: Record<string, unknown>;
  startedAt: Record<string, number>;
  hints: Record<string, boolean>;
  /** The server's verified record of each play (plays.server_state); see the *Play types in challenges.ts. */
  states: Record<string, unknown>;
};

/**
 * The signed-in player's progress, mirrored from the `plays` table. Writes go to Supabase in order, one
 * queue per day. Game state the player can't cheat with (UI state) applies locally first; moves, hints
 * and results are the server's call, so they show once it has checked them.
 */
type Cache = { userId: string; store: Store | null; error: boolean };

let cache: Cache | null = null;
const listeners = new Set<() => void>();
const queues = new Map<string, Promise<void>>();
const started = new Set<string>();
/** Latest game state per day that hasn't been sent yet; queued writes always send the newest. */
const unsentGames = new Map<string, unknown>();

function emit(next: Cache) {
  cache = next;
  listeners.forEach((l) => l());
}

function setStore(update: (s: Store) => Store) {
  if (!cache?.store) return;
  emit({ ...cache, store: update(cache.store) });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getCache = () => cache;

function toResult(row: { status: string | null; time_ms: number | null; hint_used: boolean }): DayResult | null {
  if (row.status !== "solved" && row.status !== "failed") return null;
  return { status: row.status, timeMs: row.time_ms ?? 0, hintUsed: row.hint_used };
}

async function load(userId: string) {
  if (cache?.userId === userId) return;
  queues.clear();
  started.clear();
  unsentGames.clear();
  emit({ userId, store: null, error: false });

  const { data, error } = await createClient()
    .from("plays")
    .select("challenge_day, started_at, hint_used, game_state, server_state, status, time_ms")
    .eq("user_id", userId);
  if (cache?.userId !== userId) return; // Another player signed in meanwhile.
  if (error) {
    console.error("Failed to load progress", error);
    emit({ userId, store: null, error: true });
    return;
  }

  const store: Store = { results: {}, games: {}, startedAt: {}, hints: {}, states: {} };
  for (const row of data) {
    const day = row.challenge_day;
    started.add(day);
    store.startedAt[day] = Date.parse(row.started_at);
    if (row.hint_used) store.hints[day] = true;
    if (row.game_state !== null) store.games[day] = row.game_state;
    store.states[day] = row.server_state;
    const result = toResult(row);
    if (result) store.results[day] = result;
  }
  emit({ userId, store, error: false });
}

/** Runs `task` after every earlier write for `dateKey`, so a play is created before it's updated. */
function enqueue<R extends { error: unknown }>(dateKey: string, task: () => PromiseLike<R>): Promise<R | undefined> {
  const userId = cache?.userId;
  const prev = queues.get(dateKey) ?? Promise.resolve();
  const next = prev.then(async () => {
    if (cache?.userId !== userId) return undefined;
    const response = await task();
    if (response.error) console.error(`Failed to save progress for ${dateKey}`, response.error);
    return response;
  });
  queues.set(dateKey, next.then(() => undefined));
  return next;
}

/** The signed-in player's progress on the client; null while loading and during server render. */
export function useProgress(userId: string): { store: Store | null; error: boolean } {
  useEffect(() => {
    void load(userId);
  }, [userId]);
  const current = useSyncExternalStore(subscribe, getCache, () => null);
  return current?.userId === userId ? current : { store: null, error: false };
}

export function markStarted(dateKey: string) {
  if (!cache?.store || started.has(dateKey)) return;
  started.add(dateKey);
  setStore((s) => ({ ...s, startedAt: { ...s.startedAt, [dateKey]: Date.now() } }));
  // The server stamps started_at; a play that already exists (another tab) is left alone.
  enqueue(dateKey, () =>
    createClient()
      .from("plays")
      .upsert({ challenge_day: dateKey }, { onConflict: "user_id,challenge_day", ignoreDuplicates: true }),
  );
}

type PlaySnapshot = { feedback: unknown; status: string | null; time_ms: number | null; hint_used: boolean; state: unknown };

/** Mirrors a play as the server returned it from play_move or take_hint. */
function applySnapshot(userId: string, dateKey: string, snap: PlaySnapshot) {
  if (cache?.userId !== userId) return;
  const result = toResult(snap);
  setStore((s) => ({
    ...s,
    states: { ...s.states, [dateKey]: snap.state },
    hints: snap.hint_used ? { ...s.hints, [dateKey]: true } : s.hints,
    results: result ? { ...s.results, [dateKey]: result } : s.results,
  }));
}

/**
 * Sends a move to the server, which checks it against the answer, records it and finishes the play when
 * it's won or lost (see play_move for each game's moves). Resolves to the game's feedback on the move,
 * or null if it couldn't be checked.
 */
export async function playMove<F>(dateKey: string, move: Record<string, Json>): Promise<F | null> {
  const userId = cache?.userId;
  if (!cache?.store || !userId) return null;
  const response = await enqueue(dateKey, () => createClient().rpc("play_move", { on_day: dateKey, move }));
  const snap = response?.data as PlaySnapshot | null | undefined;
  if (!snap) return null;
  applySnapshot(userId, dateKey, snap);
  return snap.feedback as F;
}

/**
 * Asks the server for the day's hint, which it records against the play (see take_hint). Resolves to the
 * hint, or null if it couldn't be had.
 */
export async function takeHint<H>(dateKey: string, context: Record<string, Json> = {}): Promise<H | null> {
  const userId = cache?.userId;
  if (!cache?.store || !userId) return null;
  const response = await enqueue(dateKey, () => createClient().rpc("take_hint", { on_day: dateKey, context }));
  const snap = response?.data as PlaySnapshot | null | undefined;
  if (!snap) return null;
  applySnapshot(userId, dateKey, snap);
  return (snap.state as { hint?: H } | null)?.hint ?? null;
}

/** Per-day UI state (typed entries, tile order, ...), saved with the rest of the play. */
export function useGameState<T>(dateKey: string, initial: T): [T, (next: T) => void] {
  const current = useSyncExternalStore(subscribe, getCache, () => null);
  const value = (current?.store?.games[dateKey] as T | undefined) ?? initial;
  const set = useCallback(
    (next: T) => {
      if (!cache?.store) return;
      setStore((s) => ({ ...s, games: { ...s.games, [dateKey]: next } }));
      const queued = unsentGames.has(dateKey);
      unsentGames.set(dateKey, next);
      if (queued) return;
      const userId = cache.userId;
      enqueue(dateKey, () => {
        const latest = unsentGames.get(dateKey);
        unsentGames.delete(dateKey);
        return createClient()
          .from("plays")
          .update({ game_state: latest as Json })
          .eq("user_id", userId)
          .eq("challenge_day", dateKey);
      });
    },
    [dateKey],
  );
  return [value, set];
}

/** Consecutive played days ending today (or yesterday, if today isn't done yet). */
export function streakFor(store: Store, today: string): number {
  let day = store.results[today] ? today : addDays(today, -1);
  let count = 0;
  while (store.results[day]) {
    count++;
    day = addDays(day, -1);
  }
  return count;
}
