import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { CheckIcon, FlameIcon, SnowflakeIcon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { fromDateKey, weekOf } from "@/lib/date";
import { FREEZE_EVERY, type Streak } from "@/lib/progress";

type Props = {
  today: string | null;
  streak: Streak | null;
  playedDays: Set<string>;
};

function plural(n: number, word: string) {
  return `${n} ${n === 1 ? word : `${word}s`}`;
}

export function StreakCard({ today, streak, playedDays }: Props) {
  const week = today ? weekOf(today) : [];
  const doneToday = today ? playedDays.has(today) : false;
  const count = streak?.streak ?? 0;
  const sub = doneToday ? "See you tomorrow!" : count > 0 ? "Keep it going!" : "Start a streak today!";
  const freezeNote = !streak
    ? null
    : streak.freezes > 0
      ? `${plural(streak.freezes, "streak freeze")} saved`
      : streak.toNextFreeze !== null
        ? `${plural(streak.toNextFreeze, "more day")} to earn a freeze`
        : null;

  return (
    <Card className="flex flex-col gap-5 px-6 py-5 sm:flex-row sm:items-center sm:gap-0 sm:px-10 sm:py-6">
      <div className="flex items-center gap-3.5 sm:w-[240px] sm:shrink-0 sm:border-r sm:border-line sm:py-2">
        <FlameIcon size={34} className="shrink-0 sm:size-10" />
        {today && streak ? (
          <div>
            <p className="text-[15px] font-semibold text-ink sm:text-lg" aria-live="polite">
              {count} day streak
            </p>
            <p className="text-xs text-ink-secondary sm:text-[15px]">{sub}</p>
            {freezeNote && (
              <p
                className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted sm:text-sm"
                title={`Every ${FREEZE_EVERY}th day you play earns a freeze, which covers a missed day so your streak lives on.`}
              >
                <SnowflakeIcon size={13} className="shrink-0" />
                {freezeNote}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 py-0.5 sm:gap-2" role="status">
            <span className="sr-only">Loading your streak…</span>
            <Skeleton className="h-4 w-28 sm:h-5 sm:w-32" />
            <Skeleton className="h-3 w-24 sm:h-4 sm:w-28" />
          </div>
        )}
      </div>

      <ol className="grid flex-1 grid-cols-7 sm:pl-8" aria-label="This week">
        {(week.length ? week : Array.from({ length: 7 }, () => "")).map((day, i) => {
          const isToday = day === today;
          const done = !!day && playedDays.has(day);
          const frozen = !!day && !done && !!streak?.frozen.has(day);
          const label = day
            ? fromDateKey(day).toLocaleDateString("en-US", { weekday: "short" })
            : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i];
          return (
            <li key={day || i} className="flex flex-col items-center gap-2 sm:gap-2.5">
              <span
                className={cn(
                  "inline-flex size-7 items-center justify-center rounded-full sm:size-9",
                  !day
                    ? "animate-pulse border border-line bg-track"
                    : done
                      ? "bg-brand text-on-brand"
                      : frozen
                        ? "bg-cat-3 text-ink"
                        : isToday
                          ? "border-2 border-brand bg-surface"
                          : "border border-line bg-track",
                )}
                aria-label={
                  day
                    ? `${label}: ${done ? "played" : frozen ? "covered by a streak freeze" : isToday ? "today" : "not played"}`
                    : label
                }
              >
                {done && <CheckIcon size={16} className="sm:size-[18px]" />}
                {frozen && <SnowflakeIcon size={16} className="sm:size-[18px]" />}
              </span>
              <span
                className={cn(
                  "text-[11px] sm:text-[15px]",
                  isToday ? "font-semibold text-ink" : "text-ink-muted",
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
