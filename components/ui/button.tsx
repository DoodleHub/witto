import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand text-on-brand shadow-brand hover:bg-brand-hover active:bg-brand-press disabled:bg-ink-faint disabled:shadow-none",
  secondary:
    "bg-surface text-ink border border-line-strong hover:bg-surface-muted active:bg-track disabled:text-ink-faint",
  ghost: "text-ink-secondary hover:bg-surface-muted hover:text-ink disabled:text-ink-faint",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm rounded-md",
  md: "h-12 px-5 text-base rounded-lg",
  lg: "h-12 px-6 text-base rounded-lg sm:h-[60px] sm:px-8 sm:text-lg sm:rounded-[14px]",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 font-semibold whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
