"use client";

import { useState } from "react";
import { AnswerGame } from "@/components/games/answer-game";
import { BeeGame } from "@/components/games/bee-game";
import { ConnectionsGame } from "@/components/games/connections-game";
import { CrosswordGame } from "@/components/games/crossword-game";
import { FactGame } from "@/components/games/fact-game";
import { WordGame } from "@/components/games/word-game";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TYPE_META,
  type AnswerPlay,
  type BeePlay,
  type DailyChallenge,
  type ConnectionsPlay,
  type CrosswordPlay,
  type FactPlay,
  type SealedChallenge,
  type WordPlay,
} from "@/lib/challenges";
import type { DayResult } from "@/lib/progress";

type Props = {
  challenge: DailyChallenge | SealedChallenge;
  /** The server's verified record of the play, shaped per game. */
  play: unknown;
  result: DayResult | undefined;
  hintUsed: boolean;
  /** Starts the play and loads the sealed challenge's content. */
  onReveal: (dateKey: string) => Promise<void>;
};

export function ChallengeCard({ challenge, play, result, hintUsed, onReveal }: Props) {
  const { dateKey } = challenge;

  return (
    <Card variant="challenge" className="px-6 pb-7 pt-6 sm:px-12 sm:pb-10 sm:pt-7">
      <Chip>
        Today&apos;s challenge <span aria-hidden="true">·</span> {TYPE_META[challenge.type].label}
      </Chip>
      {challenge.content === null ? (
        <RevealPrompt onReveal={() => onReveal(dateKey)} />
      ) : (
        <Game challenge={challenge} play={play} result={result} hintUsed={hintUsed} />
      )}
    </Card>
  );
}

function Game({ challenge, play, result, hintUsed }: Omit<Props, "challenge" | "onReveal"> & { challenge: DailyChallenge }) {
  const shared = { dateKey: challenge.dateKey, result, hintUsed };
  // The server shapes the play's state to match the challenge type.
  const state = play ?? {};

  return (
    <>
      {challenge.type === "word" && <WordGame {...shared} content={challenge.content} play={state as WordPlay} />}
      {(challenge.type === "riddle" || challenge.type === "math") && (
        <AnswerGame {...shared} content={challenge.content} play={state as AnswerPlay} />
      )}
      {challenge.type === "fact" && <FactGame {...shared} content={challenge.content} play={state as FactPlay} />}
      {challenge.type === "crossword" && <CrosswordGame {...shared} content={challenge.content} play={state as CrosswordPlay} />}
      {challenge.type === "bee" && <BeeGame {...shared} content={challenge.content} play={state as BeePlay} />}
      {challenge.type === "connections" && <ConnectionsGame {...shared} content={challenge.content} play={state as ConnectionsPlay} />}
    </>
  );
}

function RevealPrompt({ onReveal }: { onReveal: () => Promise<void> }) {
  const [state, setState] = useState<"idle" | "pending" | "error">("idle");

  async function reveal() {
    setState("pending");
    try {
      await onReveal();
    } catch (error) {
      console.error("Failed to reveal today's challenge", error);
      setState("error");
    }
  }

  return (
    <div className="mt-5 sm:mt-8">
      <p className="text-[17px] leading-snug text-ink-secondary sm:text-[22px]">
        The clock starts when you reveal the challenge.
      </p>
      <Button size="lg" className="mt-5 sm:mt-7" disabled={state === "pending"} onClick={reveal}>
        {state === "pending" ? "Revealing…" : "Reveal challenge"}
      </Button>
      {state === "error" && (
        <p className="mt-3 text-sm text-danger" role="alert">
          We couldn&apos;t reveal the challenge. Try again.
        </p>
      )}
    </div>
  );
}

export function ChallengeCardSkeleton() {
  return (
    <Card variant="challenge" className="h-[420px] px-6 pt-6 sm:h-[392px] sm:px-12 sm:pt-7" role="status" aria-busy="true">
      <span className="sr-only">Loading today&apos;s challenge…</span>
      <Skeleton tone="brand" className="h-8 w-56 rounded-full sm:h-9 sm:w-64" />
      <Skeleton tone="brand" className="mt-6 h-6 w-full max-w-[520px] sm:mt-9" />
      <Skeleton tone="brand" className="mt-2 h-6 w-2/3 max-w-[420px]" />
    </Card>
  );
}
