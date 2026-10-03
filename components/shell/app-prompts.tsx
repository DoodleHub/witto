"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { isIOS, isStandalone, type BeforeInstallPromptEvent } from "@/lib/install";
import { enablePush, getPushState } from "@/lib/push";

const INSTALL_DISMISSED_KEY = "witto:install-dismissed";
const PUSH_DISMISSED_KEY = "witto:push-prompt-dismissed";
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

type Prompt = { kind: "install-ios" } | { kind: "install-android"; event: BeforeInstallPromptEvent } | { kind: "push" };

function snoozed(key: string): boolean {
  try {
    const at = Number(localStorage.getItem(key));
    return Boolean(at) && Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
}

function snooze(key: string) {
  try {
    localStorage.setItem(key, String(Date.now()));
  } catch {}
}

async function initialPrompt(): Promise<Prompt | null> {
  if (isStandalone()) {
    if (snoozed(PUSH_DISMISSED_KEY) || !("Notification" in window) || Notification.permission !== "default") return null;
    return (await getPushState()) === "off" ? { kind: "push" } : null;
  }
  if (snoozed(INSTALL_DISMISSED_KEY)) return null;
  if (isIOS()) return { kind: "install-ios" };
  return window.__installPrompt ? { kind: "install-android", event: window.__installPrompt } : null;
}

/**
 * Mobile-only, signed-in-only alert under the header. In the browser it suggests adding Witto to the home screen; once
 * launched as the installed app it offers new puzzle alerts. The permission request has to come from a tap (iOS ignores
 * it otherwise, and Chrome downgrades sites that prompt on load), so this asks first and the button triggers the prompt.
 */
export function AppPrompts() {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    let active = true;
    initialPrompt().then((p) => active && p && setPrompt(p), () => {});
    if (isStandalone()) return () => void (active = false);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      if (!snoozed(INSTALL_DISMISSED_KEY)) setPrompt({ kind: "install-android", event: e as BeforeInstallPromptEvent });
    };
    const onInstalled = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      active = false;
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!prompt) return null;

  function dismiss() {
    snooze(prompt!.kind === "push" ? PUSH_DISMISSED_KEY : INSTALL_DISMISSED_KEY);
    setPrompt(null);
  }

  async function act() {
    setBusy(true);
    try {
      if (prompt!.kind === "install-android") {
        await prompt!.event.prompt();
        const { outcome } = await prompt!.event.userChoice;
        window.__installPrompt = undefined;
        if (outcome === "dismissed") snooze(INSTALL_DISMISSED_KEY);
      } else if (prompt!.kind === "push") {
        // Whatever they pick in the system prompt, the account menu toggle covers it from here.
        await enablePush();
      }
    } catch (error) {
      console.error("App prompt action failed", error);
    } finally {
      setBusy(false);
      setPrompt(null);
    }
  }

  const copy = {
    "install-ios": {
      title: "Add Witto to your home screen",
      body: (
        <>
          Tap <ShareGlyph /> Share, then <span className="font-semibold text-ink">Add to Home Screen</span>.
        </>
      ),
    },
    "install-android": { title: "Install Witto", body: "One tap to open today’s puzzle, right from your home screen." },
    push: { title: "Never miss a puzzle", body: "Get a nudge when the new daily challenge drops." },
  }[prompt.kind];

  return (
    <div role="status" className="mx-4 mt-1 mb-2 flex items-start gap-3 rounded-xl border border-brand-line bg-brand-soft py-3 pr-2 pl-4 sm:hidden">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{copy.title}</p>
        <p className="mt-0.5 text-sm text-ink-secondary">{copy.body}</p>
        {prompt.kind !== "install-ios" && (
          <Button size="sm" onClick={act} disabled={busy} className="mt-2">
            {prompt.kind === "push" ? "Turn on alerts" : "Install"}
          </Button>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
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
