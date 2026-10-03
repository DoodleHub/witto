"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { isIOS, isStandalone, type BeforeInstallPromptEvent } from "@/lib/install";
import { enablePush, getPushState } from "@/lib/push";

type Install = { kind: "ios" } | { kind: "android"; event: BeforeInstallPromptEvent };

async function initialInstall(): Promise<Install | null> {
  if (isIOS()) return { kind: "ios" };
  return window.__installPrompt ? { kind: "android", event: window.__installPrompt } : null;
}

/**
 * Mobile-only, signed-in-only alerts under the header: one to add Witto to the home screen until it's installed, and
 * one for new puzzle alerts until they're on. Dismissing hides an alert until the next full page load. The permission
 * request has to come from a tap (iOS ignores it otherwise, and Chrome downgrades sites that prompt on load), so this
 * asks first and the button triggers the prompt.
 */
export function AppPrompts() {
  const [install, setInstall] = useState<Install | null>(null);
  const [push, setPush] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    let active = true;
    // "denied" can only be undone in browser settings, so a button here wouldn't do anything.
    getPushState().then((state) => active && setPush(state === "off"), () => {});
    if (isStandalone()) return () => void (active = false);

    initialInstall().then((i) => active && i && setInstall(i), () => {});

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstall({ kind: "android", event: e as BeforeInstallPromptEvent });
    };
    const onInstalled = () => setInstall(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      active = false;
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      console.error("App prompt action failed", error);
    } finally {
      setBusy(false);
    }
  }

  const installAndroid = (event: BeforeInstallPromptEvent) =>
    run(async () => {
      await event.prompt();
      await event.userChoice;
      // The event is single-use; Chrome fires a fresh one later if they dismissed.
      window.__installPrompt = undefined;
      setInstall(null);
    });

  const turnOnPush = () =>
    run(async () => {
      // Whatever they pick in the system prompt, the account menu toggle covers it from here.
      await enablePush();
      setPush(false);
    });

  if (!install && !push) return null;

  return (
    <div className="mx-4 mt-1 mb-2 flex flex-col gap-2 sm:hidden">
      {install?.kind === "ios" && (
        <Alert
          title="Add Witto to your home screen"
          body={
            <>
              Tap <ShareGlyph /> Share, then <span className="font-semibold text-ink">Add to Home Screen</span>.
            </>
          }
          onDismiss={() => setInstall(null)}
          busy={busy}
        />
      )}
      {install?.kind === "android" && (
        <Alert
          title="Install Witto"
          body="One tap to open today’s puzzle, right from your home screen."
          action="Install"
          onAction={() => installAndroid(install.event)}
          onDismiss={() => setInstall(null)}
          busy={busy}
        />
      )}
      {push && (
        <Alert
          title="Never miss a puzzle"
          body="Get a nudge when the new daily challenge drops."
          action="Turn on alerts"
          onAction={turnOnPush}
          onDismiss={() => setPush(false)}
          busy={busy}
        />
      )}
    </div>
  );
}

function Alert({
  title,
  body,
  action,
  onAction,
  onDismiss,
  busy,
}: {
  title: string;
  body: ReactNode;
  action?: string;
  onAction?: () => void;
  onDismiss: () => void;
  busy: boolean;
}) {
  return (
    <div role="status" className="flex items-start gap-3 rounded-xl border border-brand-line bg-brand-soft py-3 pr-2 pl-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mt-0.5 text-sm text-ink-secondary">{body}</p>
        {action && (
          <Button size="sm" onClick={onAction} disabled={busy} className="mt-2">
            {action}
          </Button>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        disabled={busy}
        aria-label="Dismiss"
        className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-md text-ink-secondary hover:bg-surface-muted hover:text-ink"
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}

function ShareGlyph() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="inline -mt-1 text-brand-ink">
      <path d="M12 3v12M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  );
}
