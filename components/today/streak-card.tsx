import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { CheckIcon, FlameIcon } from "@/components/ui/icons";
import { fromDateKey, weekOf } from "@/lib/date";

type Props = {
  today: string | null;
  streak: number;
  playedDays: Set<string>;
};

export function StreakCard({ today, streak, playedDays }: Props) {
  const week = today ? weekOf(today) : [];
  const doneToday = today ? playedDays.has(today) : false;
  const sub = doneToday ? "See you tomorrow!" : streak > 0 ? "Keep it going!" : "Start a streak today!";

  return (
    <Card className="flex flex-col gap-5 px-6 py-5 sm:flex-row sm:items-center sm:gap-0 sm:px-10 sm:py-6">
      <div className="flex items-center gap-3.5 sm:w-[240px] sm:shrink-0 sm:border-r sm:border-line sm:py-2">
        <FlameIcon size={34} className="shrink-0 sm:size-10" />
        <div>
          <p className="text-[15px] font-semibold text-ink sm:text-lg" aria-live="polite">
            {today ? `${streak} day streak` : " "}
          </p>
          <p className="text-xs text-ink-secondary sm:text-[15px]">{today ? sub : " "}</p>
        </div>
      </div>

      <ol className="grid flex-1 grid-cols-7 sm:pl-8" aria-label="This week">
        {(week.length ? week : Array.from({ length: 7 }, () => "")).map((day, i) => {
          const isToday = day === today;
          const done = !!day && playedDays.has(day);
          const label = day
            ? fromDateKey(day).toLocaleDateString("en-US", { weekday: "short" })
            : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i];
          return (
            <li key={day || i} className="flex flex-col items-center gap-2 sm:gap-2.5">
              <span
                className={cn(
                  "inline-flex size-7 items-center justify-center rounded-full sm:size-9",
                  done
                    ? "bg-brand text-on-brand"
                    : isToday
                      ? "border-2 border-brand bg-surface"
                      : "border border-line bg-track",
                )}
                aria-label={`${label}: ${done ? "played" : isToday ? "today" : "not played"}`}
              >
                {done && <CheckIcon size={16} className="sm:size-[18px]" />}
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
