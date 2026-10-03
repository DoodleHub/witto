import type { ReactNode } from "react";
import { cn } from "./cn";

export function Overline({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("text-xs font-medium uppercase tracking-[0.1em] text-ink-secondary sm:text-overline", className)}>
      {children}
    </p>
  );
}
