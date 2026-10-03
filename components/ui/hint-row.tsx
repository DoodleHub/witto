"use client";

import { useState, type ReactNode } from "react";
import { LightbulbIcon } from "./icons";

/** "Need a nudge? Get a hint" — swaps to the revealed hint once used. */
export function HintRow({ used, hint, onHint }: { used: boolean; hint: ReactNode; onHint: () => unknown }) {
  const [pending, setPending] = useState(false);

  async function getHint() {
    setPending(true);
    try {
      await onHint();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-start justify-center gap-2.5 text-[15px] text-ink-secondary sm:justify-start sm:text-[17px]">
      <LightbulbIcon size={22} className="mt-px shrink-0 text-ink-secondary" />
      {used ? (
        <p className="animate-rise">{hint}</p>
      ) : (
        <p>
          Need a nudge?{" "}
          <button
            type="button"
            onClick={getHint}
            disabled={pending}
            className="ml-1 font-medium text-brand-ink enabled:hover:underline disabled:cursor-wait disabled:text-ink-muted"
          >
            {pending ? "Getting a hint…" : "Get a hint"}
          </button>
        </p>
      )}
    </div>
  );
}
