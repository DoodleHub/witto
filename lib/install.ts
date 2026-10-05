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

export interface InAppBrowser {
  /** Display name of the host app, or undefined when it's an unrecognised WebView. */
  app?: string;
  os: "ios" | "android";
  wechat: boolean;
}

const IN_APP_HOSTS: [RegExp, string][] = [
  [/MicroMessenger/i, "WeChat"],
  [/\bLine\//, "LINE"],
  [/Instagram/, "Instagram"],
  [/FBAN|FBAV|FB_IAB/, "Facebook"],
  [/Barcelona/, "Threads"],
  [/Twitter/i, "X"],
  [/BytedanceWebview|musical_ly|TikTok/i, "TikTok"],
  [/LinkedInApp/, "LinkedIn"],
  [/Snapchat/, "Snapchat"],
  [/Weibo/i, "Weibo"],
  [/\bQQ\//, "QQ"],
  [/DingTalk/i, "DingTalk"],
  [/Pinterest/i, "Pinterest"],
];

/**
 * Social apps open links in their own WebView, which can't install a PWA or share cookies with the real browser. Known
 * apps are matched by name; anything else is caught by the generic WebView markers (Android's `; wv)`, and iOS WebKit
 * without the `Safari/` token, which every real iOS browser sends).
 */
export function detectInAppBrowser(): InAppBrowser | null {
  if (isStandalone()) return null;
  const ua = navigator.userAgent;
  const os = isIOS() ? "ios" : /Android/i.test(ua) ? "android" : null;
  if (!os) return null;
  const app = IN_APP_HOSTS.find(([pattern]) => pattern.test(ua))?.[1];
  const webView = os === "android" ? /; wv\)/.test(ua) : /AppleWebKit/.test(ua) && !/Safari\//.test(ua);
  if (!app && !webView) return null;
  return { app, os, wechat: app === "WeChat" };
}

/**
 * A link that hands the current page to the system browser, or null where the host app blocks every way out (WeChat).
 * LINE honours an official query flag; Android apps generally pass `intent://` through to the default browser; iOS 17+
 * opens `x-safari-https://` in Safari from most WebViews.
 */
export function externalBrowserUrl(browser: InAppBrowser, location: Location): string | null {
  if (browser.wechat) return null;
  if (browser.app === "LINE") {
    const url = new URL(location.href);
    url.searchParams.set("openExternalBrowser", "1");
    return url.href;
  }
  const path = location.host + location.pathname + location.search;
  return browser.os === "android" ? `intent://${path}#Intent;scheme=https;end` : `x-safari-https://${path}`;
}
