"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { detectInAppBrowser, externalBrowserUrl, type InAppBrowser } from "@/lib/install";

// The user agent never changes during a visit, so detect once and hand React the same object every time.
let detected: InAppBrowser | null | undefined;
const subscribe = () => () => {};
const getSnapshot = () => (detected === undefined ? (detected = detectInAppBrowser()) : detected);
const getServerSnapshot = () => null;

/**
 * Shown when witto is opened from a link inside a social app's WebView (WeChat, Instagram, X…). Those can't add witto to
 * the home screen, and a sign-in there doesn't carry over to the real browser, so this asks to switch first. It tries a
 * one-tap hand-off where the host app allows one and falls back to the app's own "Open in browser" menu plus copy link.
 * Rendered for signed-out visitors too, since the switch should happen before they sign in.
 */
export function InAppBrowserNotice() {
  const browser = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [triedEscape, setTriedEscape] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!browser) return null;

  const escapeUrl = externalBrowserUrl(browser, window.location);

  const from = browser.app ? `inside ${browser.app}` : "in this in-app browser";
  // Without a working hand-off, the host app's own menu is the only way out.
  const showManual = !escapeUrl || triedEscape;

  function openExternally() {
    window.location.href = escapeUrl!;
    // If the hand-off worked the page is backgrounded; still visible means the app swallowed it.
    setTimeout(() => document.visibilityState === "visible" && setTriedEscape(true), 1200);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      // Older WebViews without clipboard access: let them long-press the URL instead.
      window.prompt("Copy this link", window.location.href);
    }
  }

  return (
    <div className="mx-4 mt-1 mb-2">
      <div role="status" className="animate-rise rounded-xl border border-brand-line bg-brand-soft px-4 py-3">
        <p className="text-sm font-semibold text-ink">Open witto in your browser</p>
        <p className="mt-0.5 text-sm text-ink-secondary">
          You’re viewing witto {from}, so it can’t be added to your home screen and your sign-in won’t stick.
        </p>
        {showManual && (
          <p className="mt-1.5 text-sm text-ink-secondary">
            {/* Host apps word this item differently (Safari, Default Browser, external browser…), so don't quote a label. */}
            Tap <span className="font-semibold text-ink">···</span> at the top right, then choose the option to open in your
            browser.
          </p>
        )}
        <div className="mt-2 flex gap-2">
          {escapeUrl && (
            <Button size="sm" onClick={openExternally}>
              Open in {browser.os === "ios" ? "Safari" : "browser"}
            </Button>
          )}
          <Button size="sm" variant={escapeUrl ? "secondary" : "primary"} onClick={copyLink}>
            {copied ? "Link copied" : "Copy link"}
          </Button>
        </div>
      </div>
    </div>
  );
}
