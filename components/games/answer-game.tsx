"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HintRow } from "@/components/ui/hint-row";
import { TextInput } from "@/components/ui/text-input";
import type { AnswerContent, AnswerPlay } from "@/lib/challenges";
import { playMove, takeHint, useGameState } from "@/lib/progress";
import { ResultBanner } from "./result-banner";
import type { GameProps } from "./types";

const REVEAL_AFTER = 3;

/** Free-text answer: riddles and math puzzles. Guesses are checked on the server, which holds the answers. */
export function AnswerGame({ dateKey, content, play, result, hintUsed, share }: GameProps<AnswerContent, AnswerPlay>) {
  const [wrong, setWrong] = useGameState<number>(dateKey, 0);
  const [value, setValue] = useState("");
  const [shakeKey, setShakeKey] = useState(0);
  const [checking, setChecking] = useState(false);
  const [checkFailed, setCheckFailed] = useState(false);
  const [givingUp, setGivingUp] = useState(false);
  const reveal = play.solution?.reveal;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const guess = value.trim();
    if (!guess || checking) return;
    setChecking(true);
    setCheckFailed(false);
    const feedback = await playMove<{ correct: boolean }>(dateKey, { guess });
    setChecking(false);
    if (!feedback) {
      setCheckFailed(true);
    } else if (!feedback.correct) {
      setWrong(wrong + 1);
      setShakeKey((k) => k + 1);
    }
  }

  async function giveUp() {
    setGivingUp(true);
    await playMove(dateKey, { give_up: true });
    setGivingUp(false);
  }

  return (
    <>
      <p className="mt-3 max-w-[560px] text-[17px] leading-snug text-ink sm:mt-5 sm:text-[26px] sm:leading-[1.35]">
        {content.prompt}
      </p>

      {result ? (
        <div className="mt-6 sm:mt-8">
          <ResultBanner
            result={result}
            share={share}
            detail={reveal && <>The answer: <strong className="font-semibold text-ink">{reveal}</strong></>}
          />
        </div>
      ) : (
        <>
          <form onSubmit={submit} className="mt-5 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:gap-3.5">
            <TextInput
              key={shakeKey}
              size="lg"
              invalid={shakeKey > 0}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Your answer"
              aria-label="Your answer"
              autoComplete="off"
              className="sm:flex-1"
            />
            <Button type="submit" size="lg" disabled={checking || givingUp} className="w-full sm:w-auto sm:min-w-[190px]">
              {checking ? "Checking…" : "Submit answer"}
            </Button>
          </form>
          {checkFailed && (
            <p className="mt-3 text-sm text-danger" role="alert">
              We couldn&apos;t check your answer. Try again.
            </p>
          )}
          {wrong > 0 && !checkFailed && (
            <p key={wrong} className="mt-3 animate-rise text-sm text-danger" role="alert">
              Not quite — try again.
              {wrong >= REVEAL_AFTER && (
                <button
                  type="button"
                  onClick={giveUp}
                  disabled={givingUp}
                  className="ml-2 font-semibold text-ink-secondary underline-offset-2 enabled:hover:underline disabled:cursor-wait disabled:text-ink-muted"
                >
                  {givingUp ? "Revealing…" : "Reveal the answer"}
                </button>
              )}
            </p>
          )}
          <div className="mt-5 sm:mt-7">
            <HintRow used={hintUsed} hint={play.hint?.text} onHint={() => takeHint(dateKey)} />
          </div>
        </>
      )}
    </>
  );
}
