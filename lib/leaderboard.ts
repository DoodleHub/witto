import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChallengeType } from "./challenges";
import type { Database } from "./supabase/database.types";

export type Period = "today" | "week" | "all";

export type Entry = {
  id: string;
  name: string;
  /** 1-based position; null for a signed-in player who hasn't scored this period. */
  rank: number | null;
  streak: number;
  /** Puzzles solved, all time. */
  solved: number;
  /** Solve time in ms for "today"; points otherwise. Null when unranked. */
  value: number | null;
  you: boolean;
};

/** The top `limit` players for the period ending on `dateKey`, plus the signed-in player wherever they stand. */
export async function fetchBoard(
  supabase: SupabaseClient<Database>,
  period: Period,
  dateKey: string,
  limit: number,
): Promise<Entry[]> {
  const { data, error } = await supabase.rpc("leaderboard", { period, on_day: dateKey, max_rows: limit });
  if (error) throw error;
  // The generated types mark every column non-null, but an unranked caller comes back with null rank and value.
  return data.map((row) => ({
    id: row.user_id,
    name: row.display_name,
    rank: (row.rank as number | null) ?? null,
    streak: row.streak,
    solved: row.solved,
    value: (row.value as number | null) ?? null,
    you: row.is_you,
  }));
}

/** One player's public record, as returned by the `player_profile` SQL function. Times are in ms. */
export type PlayerProfile = {
  display_name: string;
  /** UTC date key. */
  joined_on: string;
  played: number;
  solved: number;
  hints: number;
  points: number;
  fastest_ms: number | null;
  streak: number;
  best_streak: number;
  /** Only the types they've finished at least once. */
  types: { type: ChallengeType; played: number; solved: number; best_ms: number | null }[];
  /** Their latest finished plays, newest first. */
  recent: {
    day: string;
    number: number;
    type: ChallengeType;
    status: "solved" | "failed";
    time_ms: number;
    hint_used: boolean;
    /** Null for a failed play. */
    points: number | null;
  }[];
};

/** A player's record as of `dateKey`, or null if they don't exist. */
export async function fetchPlayerProfile(
  supabase: SupabaseClient<Database>,
  playerId: string,
  dateKey: string,
): Promise<PlayerProfile | null> {
  const { data, error } = await supabase.rpc("player_profile", { player: playerId, on_day: dateKey });
  if (error) throw error;
  // The function builds this shape with jsonb_build_object, which the generated types can only call Json.
  return data as PlayerProfile | null;
}

/** A stable avatar color per player. */
export function toneFor(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
}
