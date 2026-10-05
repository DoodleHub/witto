"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { formatCountdown } from "@/lib/date";
import { useSecondsToNextChallenge } from "@/lib/today";

/** Time left until the next challenge lands, by the server's clock. */
export function NextChallengeCountdown() {
  const secondsLeft = useSecondsToNextChallenge();

  if (secondsLeft === null) return <Skeleton className="mx-auto mt-5 h-5 w-48 sm:mt-10 sm:h-6 sm:w-56" />;
  return (
    <p className="mt-5 text-[13px] text-ink-muted sm:mt-10 sm:text-base">
      Next challenge in{" "}
      <time dateTime={`PT${secondsLeft}S`} className="font-semibold tabular-nums text-ink-secondary">
        {formatCountdown(secondsLeft)}
      </time>
    </p>
  );
}
