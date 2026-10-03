import type { HTMLAttributes } from "react";
import { cn } from "./cn";

const variants = {
  surface: "bg-surface border border-line shadow-sm",
  challenge: "bg-[image:var(--challenge-bg)] border border-brand-line shadow-card",
  muted: "bg-surface-muted border border-line",
};

export function Card({
  variant = "surface",
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: keyof typeof variants }) {
  return <div className={cn("rounded-2xl sm:rounded-[22px]", variants[variant], className)} {...props} />;
}
