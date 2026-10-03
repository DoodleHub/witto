import type { SupabaseClient } from "@supabase/supabase-js";
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

/** A stable avatar color per player. */
export function toneFor(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
}
