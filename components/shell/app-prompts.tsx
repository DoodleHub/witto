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

async function initialPrompt(signedIn: boolean): Promise<Prompt | null> {
  if (isStandalone()) {
    if (!signedIn || snoozed(PUSH_DISMISSED_KEY) || !("Notification" in window) || Notification.permission !== "default")
      return null;
    return (await getPushState()) === "off" ? { kind: "push" } : null;
  }
  if (snoozed(INSTALL_DISMISSED_KEY)) return null;
  if (isIOS()) return { kind: "install-ios" };
  return window.__installPrompt ? { kind: "install-android", event: window.__installPrompt } : null;
}

/**
 * Mobile-only banner above the tab bar. In the browser it suggests adding Witto to the home screen; once launched as
 * the installed app it offers new puzzle alerts. The permission request has to come from a tap (iOS ignores it
 * otherwise, and Chrome downgrades sites that prompt on load), so this asks first and the button triggers the prompt.
 */
export function AppPrompts({ signedIn }: { signedIn: boolean }) {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    let active = true;
    initialPrompt(signedIn).then((p) => active && p && setPrompt(p), () => {});
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
  }, [signedIn]);

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
    <div
      role="dialog"
      aria-label={copy.title}
      className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 rounded-2xl border border-line bg-surface p-4 shadow-card sm:hidden"
    >
      <p className="font-semibold text-ink">{copy.title}</p>
      <p className="mt-1 text-sm text-ink-secondary">{copy.body}</p>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={dismiss} disabled={busy}>
          {prompt.kind === "install-ios" ? "Got it" : "Not now"}
        </Button>
        {prompt.kind !== "install-ios" && (
          <Button size="sm" onClick={act} disabled={busy}>
            {prompt.kind === "push" ? "Turn on alerts" : "Install"}
          </Button>
        )}
      </div>
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
