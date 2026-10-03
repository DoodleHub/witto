import type { ReactNode } from "react";
import { LightbulbIcon } from "./icons";

/** "Need a nudge? Get a hint" — swaps to the revealed hint once used. */
export function HintRow({ used, hint, onHint }: { used: boolean; hint: ReactNode; onHint: () => void }) {
  return (
    <div className="flex items-start justify-center gap-2.5 text-[15px] text-ink-secondary sm:justify-start sm:text-[17px]">
      <LightbulbIcon size={22} className="mt-px shrink-0 text-ink-secondary" />
      {used ? (
        <p className="animate-rise">{hint}</p>
      ) : (
        <p>
          Need a nudge?{" "}
          <button type="button" onClick={onHint} className="ml-1 font-medium text-brand-ink hover:underline">
            Get a hint
          </button>
        </p>
      )}
    </div>
  );
}
