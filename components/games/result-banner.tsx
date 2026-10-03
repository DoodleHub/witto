import Link from "next/link";
import { CheckIcon } from "@/components/ui/icons";
import { cn } from "@/components/ui/cn";
import type { DayResult } from "@/lib/progress";
import { formatDuration } from "@/lib/date";

export function ResultBanner({ result, detail }: { result: DayResult; detail?: React.ReactNode }) {
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
      <Link
        href="/leaderboard"
        className="shrink-0 self-start rounded-lg px-1 text-sm font-semibold text-brand-ink hover:underline sm:self-center"
      >
        See leaderboard →
      </Link>
    </div>
  );
}
