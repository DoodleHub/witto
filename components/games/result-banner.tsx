import Link from "next/link";
import { CheckIcon } from "@/components/ui/icons";
import { cn } from "@/components/ui/cn";
import type { DayResult } from "@/lib/progress";
import { formatDuration } from "@/lib/date";
import { ShareButton } from "./share-button";

export function ResultBanner({
  result,
  detail,
  share,
}: {
  result: DayResult;
  detail?: React.ReactNode;
  /** The spoiler-free summary to share, when there is one. */
  share?: string;
}) {
  const solved = result.status === "solved";
  return (
    <div
      role="status"
      className={cn(
        "flex animate-rise flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5",
        solved ? "border-success/25 bg-success-soft" : "border-line bg-surface-muted",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full",
            solved ? "bg-success text-white" : "bg-ink-faint text-white",
          )}
        >
          <CheckIcon size={18} />
        </span>
        <div>
          <p className="font-semibold text-ink">
            {solved ? `Solved in ${formatDuration(result.timeMs)}` : "Better luck tomorrow"}
            {solved && result.hintUsed && <span className="font-normal text-ink-muted"> · with a hint</span>}
          </p>
          {detail && <p className="mt-0.5 text-ink-secondary">{detail}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-4 self-start sm:self-center">
        {share && <ShareButton text={share} />}
        <Link href="/leaderboard" className="rounded-lg px-1 text-sm font-semibold text-brand-ink hover:underline">
          See leaderboard →
        </Link>
      </div>
    </div>
  );
}
