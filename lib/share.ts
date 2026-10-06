import {
  TYPE_META,
  type BeeContent,
  type BeePlay,
  type ConnectionsPlay,
  type CrosswordContent,
  type CrosswordPlay,
  type DailyChallenge,
  type FactPlay,
  type Mark,
  type WordPlay,
} from "./challenges";
import { formatDuration } from "./date";
import type { DayResult } from "./progress";

const WORD_TILES: Record<Mark, string> = { correct: "🟪", present: "🟨", absent: "⬜" };
/** Matches the --cat-* tones of the connections groups, in group order. */
const GROUP_TILES = ["🟨", "🟩", "🟦", "🟪"];

/**
 * A spoiler-free summary of a finished play to paste anywhere: the shape of the game from the server's
 * verified record of it (`play`), never the answers, plus the time, hint and streak. The share button adds
 * the link.
 */
export function shareText({
  challenge,
  play,
  result,
  streak,
}: {
  challenge: DailyChallenge;
  play: unknown;
  result: DayResult;
  streak: number;
}): string {
  const solved = result.status === "solved";
  const { headline, grid } = summary(challenge, play ?? {}, solved);
  const stats = [
    headline,
    solved && `⏱ ${formatDuration(result.timeMs)}`,
    result.hintUsed && "💡 hint",
    streak > 1 && `🔥 ${streak}`,
  ].filter(Boolean);

  return [`witto #${challenge.number} · ${TYPE_META[challenge.type].label}`, stats.join(" · "), ...grid]
    .filter(Boolean)
    .join("\n");
}

function summary(challenge: DailyChallenge, play: unknown, solved: boolean): { headline: string; grid: string[] } {
  switch (challenge.type) {
    case "word": {
      const { guesses = [], marks = [] } = play as WordPlay;
      return {
        headline: `${solved ? guesses.length : "X"}/5`,
        grid: marks.map((row) => row.map((m) => WORD_TILES[m]).join("")),
      };
    }
    case "connections": {
      const { tried = [], mistakes = 0, solution, solved: found = [] } = play as ConnectionsPlay;
      // Finished plays carry every group; the found ones are a fallback should the solution be missing.
      const groups = solution?.groups.map((g, group) => ({ group, words: g.words })) ?? found;
      const groupOf = new Map(groups.flatMap((g) => g.words.map((w) => [w, g.group] as const)));
      return {
        headline: solved ? `${mistakes} ${mistakes === 1 ? "mistake" : "mistakes"}` : "✖ Out of mistakes",
        grid: tried.map((key) =>
          key
            .split("|")
            .map((w) => GROUP_TILES[groupOf.get(w) ?? -1] ?? "⬜")
            .join(""),
        ),
      };
    }
    case "crossword": {
      const { hint } = play as CrosswordPlay;
      const { grid } = challenge.content as CrosswordContent;
      // The grid's shape only: filled squares, blocks, and the square a hint gave away.
      return {
        headline: solved ? "✅ Solved" : "✖ Revealed",
        grid: grid.map((row, r) =>
          [...row]
            .map((ch, c) => (ch === "#" ? "⬛" : hint?.cell === r * row.length + c ? "💡" : solved ? "🟪" : "⬜"))
            .join(""),
        ),
      };
    }
    case "bee": {
      const { found = [] } = play as BeePlay;
      const { goal } = challenge.content as BeeContent;
      return { headline: `🐝 ${found.length}/${goal} words`, grid: [] };
    }
    case "fact": {
      const { picked } = play as FactPlay;
      return { headline: picked === undefined ? "✖ Gave up" : solved ? "✅ Got it" : "❌ Not this time", grid: [] };
    }
    case "math":
    case "riddle":
      return { headline: solved ? "✅ Solved" : "✖ Revealed", grid: [] };
  }
}
