// Mock leaderboard: Witto has no other players yet, so rankings are generated
// deterministically from the date. Same day → same board for everyone.

export type Period = "today" | "week" | "all";

export type Entry = {
  id: string;
  name: string;
  place: string;
  streak: number;
  /** Solve time in ms for "today"; points otherwise. */
  value: number;
  you?: boolean;
};

const PLAYERS: [string, string][] = [
  ["Maya Okafor", "Lagos"],
  ["Theo Lindqvist", "Stockholm"],
  ["Priya Raman", "Bengaluru"],
  ["Lucas Ferreira", "Porto"],
  ["Hana Sato", "Osaka"],
  ["Sam Whitaker", "Leeds"],
  ["Inés Calderón", "Valencia"],
  ["Noah Becker", "Hamburg"],
  ["Amara Diallo", "Dakar"],
  ["Jun Park", "Seoul"],
  ["Olivia Grant", "Toronto"],
  ["Mateo Rossi", "Bologna"],
  ["Zoe Martin", "Lyon"],
  ["Kai Nakamura", "Honolulu"],
  ["Elena Petrova", "Sofia"],
  ["Ravi Shah", "Leicester"],
  ["Ada Mensah", "Accra"],
  ["Felix Wagner", "Vienna"],
];

function rng(seed: string) {
  let h = 1779033703;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 3432918353);
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export function mockBoard(period: Period, dateKey: string): Entry[] {
  // Weekly and all-time boards change slowly; today's reshuffles daily.
  const seed = period === "today" ? dateKey : period === "week" ? dateKey.slice(0, 8) : "all-time";
  const rand = rng(`${period}:${seed}`);
  const entries = PLAYERS.map(([name, place], i) => {
    const skill = 1 - i / PLAYERS.length; // earlier players are a bit stronger on average
    const noise = rand();
    const value =
      period === "today"
        ? Math.round((38 + (1 - skill) * 140 + noise * 110) * 1000)
        : period === "week"
          ? Math.round(320 + skill * 260 + noise * 220)
          : Math.round(4200 + skill * 5200 + noise * 3800);
    return {
      id: `p${i}`,
      name,
      place,
      streak: Math.max(1, Math.round(skill * 60 * (0.4 + rand()))),
      value,
    };
  });
  return entries.sort((a, b) => (period === "today" ? a.value - b.value : b.value - a.value));
}

/** Points a real result would earn, so the player can slot into the weekly board. */
export function pointsFor(timeMs: number, hintUsed: boolean): number {
  return Math.max(20, Math.round(100 - timeMs / 6000) - (hintUsed ? 20 : 0));
}
