"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HintRow } from "@/components/ui/hint-row";
import { TextInput } from "@/components/ui/text-input";
import { isCorrectAnswer, type AnswerContent } from "@/lib/challenges";
import { useGameState } from "@/lib/progress";
import { ResultBanner } from "./result-banner";
import type { GameProps } from "./types";

const REVEAL_AFTER = 3;

/** Free-text answer: riddles and math puzzles. */
export function AnswerGame({ dateKey, content, result, onResult, hintUsed, onHint }: GameProps<AnswerContent>) {
  const [wrong, setWrong] = useGameState<number>(dateKey, 0);
  const [value, setValue] = useState("");
  const [shakeKey, setShakeKey] = useState(0);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    if (isCorrectAnswer(value, content.answers)) {
      onResult("solved");
    } else {
      setWrong(wrong + 1);
      setShakeKey((k) => k + 1);
    }
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
            detail={<>The answer: <strong className="font-semibold text-ink">{content.reveal}</strong></>}
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
            <Button type="submit" size="lg" className="w-full sm:w-auto sm:min-w-[190px]">
              Submit answer
            </Button>
          </form>
          {wrong > 0 && (
            <p key={wrong} className="mt-3 animate-rise text-sm text-danger" role="alert">
              Not quite — try again.
              {wrong >= REVEAL_AFTER && (
                <button
                  type="button"
                  onClick={() => onResult("failed")}
                  className="ml-2 font-semibold text-ink-secondary underline-offset-2 hover:underline"
                >
                  Reveal the answer
                </button>
              )}
            </p>
          )}
          <div className="mt-5 sm:mt-7">
            <HintRow used={hintUsed} hint={content.hint} onHint={onHint} />
          </div>
        </>
      )}
    </>
  );
}
