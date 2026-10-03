"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { HintRow } from "@/components/ui/hint-row";
import type { ConnectionsContent } from "@/lib/challenges";
import { useGameState } from "@/lib/progress";
import { ResultBanner } from "./result-banner";
import type { GameProps } from "./types";

const MAX_MISTAKES = 4;
const GROUP_TONES = ["bg-cat-1", "bg-cat-2", "bg-cat-3", "bg-cat-4"];

type State = { solved: number[]; mistakes: number; order: string[]; tried: string[] };

function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function ConnectionsGame({ dateKey, content, result, onResult, hintUsed, onHint }: GameProps<ConnectionsContent>) {
  const { groups } = content;
  const [state, setState] = useGameState<State>(dateKey, {
    solved: [],
    mistakes: 0,
    order: seededShuffle(groups.flatMap((g) => g.words), dateKey),
    tried: [],
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [shake, setShake] = useState(0);

  const groupOf = (word: string) => groups.findIndex((g) => g.words.includes(word));
  const solvedWords = new Set(state.solved.flatMap((g) => groups[g].words));
  const remaining = state.order.filter((w) => !solvedWords.has(w));
  // After a loss, show every group in its row.
  const shownGroups = result?.status === "failed" ? [...state.solved, ...groups.map((_, i) => i).filter((i) => !state.solved.includes(i))] : state.solved;

  function toggle(word: string) {
    setMessage(null);
    setSelected((s) => (s.includes(word) ? s.filter((w) => w !== word) : s.length < 4 ? [...s, word] : s));
  }

  function submit() {
    const key = [...selected].sort().join("|");
    if (state.tried.includes(key)) {
      setMessage("Already guessed!");
      return;
    }
    const counts = new Map<number, number>();
    selected.forEach((w) => counts.set(groupOf(w), (counts.get(groupOf(w)) ?? 0) + 1));
    const best = Math.max(...counts.values());
    if (best === 4) {
      const g = groupOf(selected[0]);
      const solved = [...state.solved, g];
      setState({ ...state, solved, tried: [...state.tried, key] });
      setSelected([]);
      if (solved.length === groups.length) onResult("solved");
      return;
    }
    const mistakes = state.mistakes + 1;
    setState({ ...state, mistakes, tried: [...state.tried, key] });
    setShake((s) => s + 1);
    setMessage(best === 3 ? "One away…" : null);
    if (mistakes >= MAX_MISTAKES) {
      setSelected([]);
      onResult("failed");
    }
  }

  const hintGroup = groups.findIndex((_, i) => !state.solved.includes(i));

  return (
    <>
      <p className="mt-3 text-[17px] text-ink-secondary sm:mt-4 sm:text-xl">
        Sort the sixteen words into four groups of four. Watch out for red herrings.
      </p>

      <div className="mt-5 flex flex-col gap-2 sm:mt-8 sm:gap-2.5">
        {shownGroups.map((g) => (
          <div
            key={g}
            className={cn("flex animate-rise flex-col items-center justify-center rounded-xl px-3 py-3 text-center sm:min-h-[76px]", GROUP_TONES[g])}
          >
            <p className="text-sm font-bold uppercase tracking-[0.06em] text-ink sm:text-base">{groups[g].theme}</p>
            <p className="text-sm text-ink-secondary sm:text-base">{groups[g].words.join(", ")}</p>
          </div>
        ))}

        {!result && (
          <div key={shake} className={cn("grid grid-cols-4 gap-2 sm:gap-2.5", shake > 0 && "animate-shake")}>
            {remaining.map((w) => {
              const on = selected.includes(w);
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => toggle(w)}
                  aria-pressed={on}
                  className={cn(
                    "flex h-16 items-center justify-center rounded-xl px-1 text-[11px] font-bold uppercase leading-tight transition-colors min-[400px]:text-xs sm:h-[76px] sm:text-[15px]",
                    on ? "bg-brand text-on-brand" : "bg-track text-ink hover:bg-brand-soft",
                  )}
                >
                  {w}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!result && (
        <>
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-ink-secondary">
            Mistakes remaining:
            {Array.from({ length: MAX_MISTAKES }, (_, i) => (
              <span
                key={i}
                className={cn("size-2.5 rounded-full", i < MAX_MISTAKES - state.mistakes ? "bg-ink-secondary" : "bg-track")}
              />
            ))}
          </div>
          <p className="mt-2 h-5 text-center text-sm font-semibold text-ink" aria-live="polite">
            {message}
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2.5">
            <Button
              variant="secondary"
              onClick={() =>
                setState({ ...state, order: seededShuffle(state.order, `${Date.now()}`) })
              }
            >
              Shuffle
            </Button>
            <Button variant="secondary" disabled={selected.length === 0} onClick={() => setSelected([])}>
              Deselect all
            </Button>
            <Button disabled={selected.length !== 4} onClick={submit}>
              Submit
            </Button>
          </div>
        </>
      )}

      <div className="mt-6 sm:mt-8">
        {result ? (
          <ResultBanner
            result={result}
            detail={
              result.status === "solved"
                ? `All four groups with ${state.mistakes} ${state.mistakes === 1 ? "mistake" : "mistakes"}.`
                : "Here's how the groups fit together."
            }
          />
        ) : (
          <HintRow
            used={hintUsed}
            onHint={onHint}
            hint={
              <>
                One group is <strong className="font-semibold text-ink">{groups[hintGroup]?.theme}</strong>.
              </>
            }
          />
        )}
      </div>
    </>
  );
}
