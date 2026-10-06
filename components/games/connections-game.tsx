"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { HintRow } from "@/components/ui/hint-row";
import type { ConnectionsContent, ConnectionsGroup, ConnectionsPlay } from "@/lib/challenges";
import { playMove, takeHint, useGameState } from "@/lib/progress";
import { ResultBanner } from "./result-banner";
import type { GameProps } from "./types";

const MAX_MISTAKES = 4;
const GROUP_TONES = ["bg-cat-1", "bg-cat-2", "bg-cat-3", "bg-cat-4"];

/** The player's tile order; which groups are found, and the mistakes made, are the server's record. */
type State = { order: string[] };

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

/** Groups are checked on the server, which holds them; the board only knows the sixteen words. */
export function ConnectionsGame({ dateKey, content, play, result, hintUsed, share }: GameProps<ConnectionsContent, ConnectionsPlay>) {
  const [state, setState] = useGameState<State>(dateKey, { order: content.words });
  const [selected, setSelected] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [shake, setShake] = useState(0);

  const solved = play.solved ?? [];
  const mistakes = play.mistakes ?? 0;
  const solvedWords = new Set(solved.flatMap((g) => g.words));
  const remaining = state.order.filter((w) => !solvedWords.has(w));
  // After a loss, show every group in its row: the found ones first, then the rest.
  const shownGroups: (ConnectionsGroup & { group: number })[] = [
    ...solved,
    ...(result?.status === "failed" ? (play.solution?.groups ?? []) : [])
      .map((g, group) => ({ ...g, group }))
      .filter((g) => !solved.some((s) => s.group === g.group)),
  ];

  function toggle(word: string) {
    setMessage(null);
    setSelected((s) => (s.includes(word) ? s.filter((w) => w !== word) : s.length < 4 ? [...s, word] : s));
  }

  async function submit() {
    if (checking) return;
    setChecking(true);
    const feedback = await playMove<{ correct?: boolean; one_away?: boolean; repeat?: boolean }>(dateKey, {
      words: selected,
    });
    setChecking(false);
    if (!feedback) {
      setMessage("Couldn't check that group. Try again.");
    } else if (feedback.repeat) {
      setMessage("Already guessed!");
    } else if (feedback.correct) {
      setSelected([]);
    } else {
      setShake((s) => s + 1);
      setMessage(feedback.one_away ? "One away…" : null);
    }
  }


  return (
    <>
      <p className="mt-3 text-[17px] text-ink-secondary sm:mt-4 sm:text-xl">
        Sort the sixteen words into four groups of four. Watch out for red herrings.
      </p>

      <div className="mt-5 flex flex-col gap-2 sm:mt-8 sm:gap-2.5">
        {shownGroups.map((g) => (
          <div
            key={g.group}
            className={cn("flex animate-rise flex-col items-center justify-center rounded-xl px-3 py-3 text-center sm:min-h-[76px]", GROUP_TONES[g.group])}
          >
            <p className="text-sm font-bold uppercase tracking-[0.06em] text-ink sm:text-base">{g.theme}</p>
            <p className="text-sm text-ink-secondary sm:text-base">{g.words.join(", ")}</p>
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
                className={cn("size-2.5 rounded-full", i < MAX_MISTAKES - mistakes ? "bg-ink-secondary" : "bg-track")}
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
            <Button disabled={selected.length !== 4 || checking} onClick={submit}>
              {checking ? "Checking…" : "Submit"}
            </Button>
          </div>
        </>
      )}

      <div className="mt-6 sm:mt-8">
        {result ? (
          <ResultBanner
            result={result}
            share={share}
            detail={
              result.status === "solved"
                ? `All four groups with ${mistakes} ${mistakes === 1 ? "mistake" : "mistakes"}.`
                : "Here's how the groups fit together."
            }
          />
        ) : (
          <HintRow
            used={hintUsed}
            onHint={() => takeHint(dateKey)}
            hint={
              play.hint && (
                <>
                  One group is <strong className="font-semibold text-ink">{play.hint.theme}</strong>.
                </>
              )
            }
          />
        )}
      </div>
    </>
  );
}
