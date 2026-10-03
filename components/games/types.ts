import type { DayResult } from "@/lib/progress";

/**
 * A game gets the challenge's public content and the server's verified record of the play (`play`).
 * Moves and hints go through playMove / takeHint, which update `play`, `result` and `hintUsed`.
 */
export type GameProps<C, P> = {
  dateKey: string;
  content: C;
  play: P;
  result: DayResult | undefined;
  hintUsed: boolean;
};
