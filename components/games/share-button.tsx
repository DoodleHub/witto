"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckIcon, ShareIcon } from "@/components/ui/icons";

/**
 * Shares a finished play's summary through the system share sheet where there is one (phones and the
 * installed app), and copies it to the clipboard everywhere else.
 */
export function ShareButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), 2000);
    return () => clearTimeout(timer);
  }, [state]);

  async function share() {
    const message = `${text}\n${location.origin}`;
    // Only touch devices get the share sheet: on desktop it's a detour from simply pasting.
    const sheet = typeof navigator.share === "function" && matchMedia("(pointer: coarse)").matches;
    if (sheet) {
      try {
        await navigator.share({ text: message });
        return;
      } catch (error) {
        // The player closed the sheet; anything else falls back to copying.
        if ((error as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(message);
      setState("copied");
    } catch (error) {
      console.error("Failed to copy the result", error);
      setState("error");
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={share} aria-live="polite">
      {state === "copied" ? <CheckIcon size={16} /> : <ShareIcon size={16} />}
      {state === "copied" ? "Copied" : state === "error" ? "Couldn't copy" : "Share"}
    </Button>
  );
}
