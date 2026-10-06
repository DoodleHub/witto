"use client";

import { Button } from "@/components/ui/button";
import { CheckIcon, UserPlusIcon } from "@/components/ui/icons";
import { INVITE_TEXT, useShare } from "@/lib/share";

/**
 * The invitation at the foot of the Today page, where a player lands once today's puzzle is done. Separate from
 * sharing a result: it's for bringing someone in, so it works before or without a finished play.
 */
export function InviteStrip() {
  const { state, share } = useShare();
  return (
    <section aria-label="Invite friends" className="flex flex-col items-center gap-3 text-center">
      <p className="text-[13px] text-ink-secondary sm:text-base">Everyone gets the same puzzle. Race a friend on it.</p>
      <Button variant="secondary" size="sm" onClick={() => share(INVITE_TEXT)} aria-live="polite">
        {state === "copied" ? <CheckIcon size={16} /> : <UserPlusIcon size={16} />}
        {state === "copied" ? "Link copied" : state === "error" ? "Couldn't copy" : "Invite friends"}
      </Button>
    </section>
  );
}
