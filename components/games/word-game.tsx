"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/components/ui/cn";
import { HintRow } from "@/components/ui/hint-row";
import { BackspaceIcon } from "@/components/ui/icons";
import type { WordContent } from "@/lib/challenges";
import { VALID_GUESSES } from "@/lib/content/words5";
import { useGameState } from "@/lib/progress";
import { ResultBanner } from "./result-banner";
import type { GameProps } from "./types";

const ROWS = 5;
const LEN = 5;
const KEY_ROWS = ["qwertyuiop", "asdfghjkl", "+zxcvbnm-"];

type Mark = "correct" | "present" | "absent";

/** Standard scoring with duplicate-letter handling. */
function score(guess: string, answer: string): Mark[] {
  const marks: Mark[] = Array(LEN).fill("absent");
  const remaining: Record<string, number> = {};
  for (let i = 0; i < LEN; i++) {
    if (guess[i] === answer[i]) marks[i] = "correct";
    else remaining[answer[i]] = (remaining[answer[i]] ?? 0) + 1;
  }
  for (let i = 0; i < LEN; i++) {
    if (marks[i] !== "correct" && remaining[guess[i]]) {
      marks[i] = "present";
      remaining[guess[i]]--;
    }
  }
  return marks;
}

const tileTone: Record<Mark, string> = {
  correct: "bg-tile-correct border-tile-correct text-white",
  present: "bg-tile-present border-tile-present text-white",
  absent: "bg-tile-absent border-tile-absent text-white",
};

export function WordGame({ dateKey, content, result, onResult, hintUsed, onHint }: GameProps<WordContent>) {
  const answer = content.answer;
  const [guesses, setGuesses] = useGameState<string[]>(dateKey, []);
  const [current, setCurrent] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const done = !!result;

  const keyMarks: Record<string, Mark> = {};
  for (const g of guesses) {
    score(g, answer).forEach((m, i) => {
      const prev = keyMarks[g[i]];
      if (prev === "correct" || (prev === "present" && m === "absent")) return;
      keyMarks[g[i]] = m;
    });
  }

  const press = useCallback(
    (key: string) => {
      if (done) return;
      setMessage(null);
      if (key === "enter") {
        if (current.length < LEN) {
          setMessage("Not enough letters");
          setShake((s) => s + 1);
          return;
        }
        if (current !== answer && !VALID_GUESSES.has(current)) {
          setMessage("Not in word list");
          setShake((s) => s + 1);
          return;
        }
        const next = [...guesses, current];
        setGuesses(next);
        setCurrent("");
        if (current === answer) onResult("solved");
        else if (next.length >= ROWS) onResult("failed");
      } else if (key === "backspace") {
        setCurrent((c) => c.slice(0, -1));
      } else if (/^[a-z]$/.test(key) && current.length < LEN) {
        setCurrent((c) => c + key);
      }
    },
    [answer, current, done, guesses, onResult, setGuesses],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key.toLowerCase();
      if (k === "enter" || k === "backspace" || /^[a-z]$/.test(k)) {
        e.preventDefault();
        press(k);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  // Hint: one position the player hasn't nailed yet.
  const solvedPositions = new Set<number>();
  guesses.forEach((g) => score(g, answer).forEach((m, i) => m === "correct" && solvedPositions.add(i)));
  const hintPos = [...Array(LEN).keys()].find((i) => !solvedPositions.has(i)) ?? 0;

  return (
    <>
      <p className="mt-3 text-[17px] text-ink-secondary sm:mt-4 sm:text-xl">
        Guess the five-letter word in five tries. Tiles turn violet for the right spot and gold for the wrong spot.
      </p>

      <div className="mt-6 flex flex-col items-center gap-1.5 sm:mt-8 sm:gap-2" role="grid" aria-label="Guesses">
        {Array.from({ length: ROWS }, (_, r) => {
          const submitted = guesses[r];
          const isCurrent = r === guesses.length && !done;
          const letters = submitted ?? (isCurrent ? current : "");
          const marks = submitted ? score(submitted, answer) : null;
          return (
            <div
              key={isCurrent ? `cur-${shake}` : r}
              role="row"
              className={cn("flex gap-1.5 sm:gap-2", isCurrent && shake > 0 && message && "animate-shake")}
            >
              {Array.from({ length: LEN }, (_, c) => {
                const ch = letters[c] ?? "";
                return (
                  <div
                    key={c}
                    role="gridcell"
                    aria-label={ch ? `${ch}${marks ? `, ${marks[c]}` : ""}` : "empty"}
                    style={marks ? { animationDelay: `${c * 90}ms` } : undefined}
                    className={cn(
                      "flex size-[52px] items-center justify-center rounded-lg border-2 text-2xl font-bold uppercase sm:size-[60px] sm:text-[28px]",
                      marks
                        ? cn(tileTone[marks[c]], "animate-flip")
                        : ch
                          ? "animate-pop border-ink-muted bg-surface text-ink"
                          : "border-line-strong bg-surface/70",
                    )}
                  >
                    {ch}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <p className="mt-3 h-5 text-center text-sm font-medium text-danger" aria-live="polite">
        {message}
      </p>

      {done ? (
        <div className="mt-3">
          <ResultBanner
            result={result}
            detail={
              <>
                The word was <strong className="font-semibold uppercase tracking-wide text-ink">{answer}</strong>.
              </>
            }
          />
        </div>
      ) : (
        <>
          <div className="mx-auto mt-3 flex max-w-[560px] flex-col gap-1.5 sm:gap-2" aria-label="Keyboard">
            {KEY_ROWS.map((row) => (
              <div key={row} className="flex justify-center gap-1 sm:gap-1.5">
                {row.split("").map((k) => {
                  const key = k === "+" ? "enter" : k === "-" ? "backspace" : k;
                  const mark = keyMarks[k];
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => press(key)}
                      aria-label={key === "backspace" ? "Delete" : key}
                      className={cn(
                        "flex h-12 min-w-0 items-center justify-center rounded-md text-sm font-semibold uppercase transition-colors sm:h-[52px] sm:text-base",
                        key.length > 1 ? "flex-[1.5] px-1 text-xs sm:text-sm" : "flex-1",
                        mark ? tileTone[mark] : "bg-surface text-ink shadow-sm ring-1 ring-line hover:bg-surface-muted",
                      )}
                    >
                      {key === "backspace" ? <BackspaceIcon size={20} /> : key === "enter" ? "Enter" : k}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="mt-6 sm:mt-7">
            <HintRow
              used={hintUsed}
              onHint={onHint}
              hint={
                <>
                  Letter {hintPos + 1} is{" "}
                  <strong className="font-semibold uppercase text-brand-ink">{answer[hintPos]}</strong>.
                </>
              }
            />
          </div>
        </>
      )}
    </>
  );
}
