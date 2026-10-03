import type { HTMLAttributes } from "react";
import { cn } from "./cn";

const tones = {
  /** On surface cards. */
  track: "bg-track",
  /** On the violet challenge wash. */
  brand: "bg-brand-soft",
};

/** A pulsing placeholder block; size and shape come from `className`. */
export function Skeleton({
  tone = "track",
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: keyof typeof tones }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md", tones[tone], className)} {...props} />;
}
