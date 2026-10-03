import type { InputHTMLAttributes } from "react";
import { cn } from "./cn";

export function TextInput({
  className,
  invalid,
  size = "md",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & { invalid?: boolean; size?: "md" | "lg" }) {
  return (
    <input
      className={cn(
        "w-full min-w-0 rounded-lg border bg-surface text-ink placeholder:text-ink-faint shadow-sm outline-none transition-[border-color,box-shadow] duration-150",
        "focus:border-brand focus:ring-4 focus:ring-[var(--focus-ring)]",
        size === "lg" ? "h-12 px-4 text-base sm:h-[60px] sm:px-5 sm:text-lg sm:rounded-[14px]" : "h-12 px-4 text-base",
        invalid ? "border-danger animate-shake" : "border-line-strong",
        className,
      )}
      {...props}
    />
  );
}
