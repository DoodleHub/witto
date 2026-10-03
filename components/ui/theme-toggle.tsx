"use client";

import { THEME_STORAGE_KEY } from "@/lib/theme";
import { MoonIcon, SunIcon } from "./icons";

export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const current =
      root.getAttribute("data-theme") ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="inline-flex size-10 items-center justify-center rounded-full text-ink-secondary transition-colors hover:bg-surface-muted hover:text-ink"
    >
      <MoonIcon size={20} className="theme-icon-dark" />
      <SunIcon size={20} className="theme-icon-light" />
    </button>
  );
}
