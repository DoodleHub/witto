import { cn } from "./cn";

const tones = ["bg-cat-1", "bg-cat-2", "bg-cat-3", "bg-cat-4"];

/** Initials avatar. `tone` picks a category color; the "you" avatar uses the brand gradient. */
export function Avatar({
  name,
  size = 40,
  tone,
  you,
  className,
}: {
  name: string;
  size?: number;
  tone?: number;
  you?: boolean;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-2 ring-surface",
        you
          ? "bg-[linear-gradient(135deg,#f7b98c,#e9799b_55%,#8f6cf0)] text-white"
          : cn(tones[(tone ?? 0) % tones.length], "text-ink"),
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
