import { TYPE_ICONS } from "@/components/ui/icons";
import { CHALLENGE_TYPES, TYPE_META } from "@/lib/challenges";

export function TomorrowStrip() {
  return (
    <section aria-label="Challenge types" className="flex flex-col items-center gap-4 sm:gap-5">
      <div className="flex w-full items-center gap-3 sm:max-w-[640px] sm:gap-4">
        <span className="h-px flex-1 bg-line" />
        <p className="text-[13px] text-ink-secondary sm:text-base">A different kind of challenge tomorrow.</p>
        <span className="h-px flex-1 bg-line" />
      </div>
      <ul className="flex items-center gap-5 text-ink-muted sm:gap-8">
        {CHALLENGE_TYPES.map((t) => {
          const Icon = TYPE_ICONS[t];
          return (
            <li key={t} title={TYPE_META[t].label}>
              <Icon size={28} className="sm:size-8" />
              <span className="sr-only">{TYPE_META[t].label}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
