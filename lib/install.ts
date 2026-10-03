/**
 * Chrome/Android fires `beforeinstallprompt` once, often before React hydrates, so this inline script stashes it on
 * `window` for the install banner to pick up later.
 */
export const INSTALL_PROMPT_SCRIPT = `window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__installPrompt=e})`;

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __installPrompt?: BeforeInstallPromptEvent;
  }
  interface Navigator {
    /** iOS Safari: true when launched from the home screen. */
    standalone?: boolean;
  }
}

export function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
}

export function isIOS(): boolean {
  // iPadOS reports itself as a Mac, so fall back to touch support.
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
