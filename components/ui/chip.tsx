import type { ReactNode } from "react";
import { cn } from "./cn";

const tones = {
  brand: "bg-brand-soft text-brand-ink",
  neutral: "bg-surface-muted text-ink-secondary",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
};

export function Chip({
  children,
  tone = "brand",
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.04em] sm:gap-1.5 sm:px-4 sm:py-2 sm:text-[13px] sm:tracking-[0.06em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
