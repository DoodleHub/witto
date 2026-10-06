"use client";

import { Button } from "@/components/ui/button";
import { CheckIcon, ShareIcon } from "@/components/ui/icons";
import { useShare } from "@/lib/share";

/** Shares a finished play's summary, with a link to witto. */
export function ShareButton({ text }: { text: string }) {
  const { state, share } = useShare();
  return (
    <Button variant="secondary" size="sm" onClick={() => share(text)} aria-live="polite">
      {state === "copied" ? <CheckIcon size={16} /> : <ShareIcon size={16} />}
      {state === "copied" ? "Copied" : state === "error" ? "Couldn't copy" : "Share"}
    </Button>
  );
}
