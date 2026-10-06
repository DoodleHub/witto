import type { CSSProperties } from "react";

const COLORS = ["var(--brand)", "var(--tile-present)", "var(--cat-2)", "var(--cat-3)", "var(--cat-4)", "var(--flame-to)"];
const PIECES = 36;

/** A cheap, repeatable spread so every burst looks the same and nothing is random during render. */
function spread(i: number, salt: number) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * A one-off burst of confetti from the lower middle of its nearest positioned ancestor, clipped to that ancestor.
 * It is purely decorative and finishes invisible, so it can stay mounted. Reduced motion skips straight to the end.
 */
export function Confetti() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      {Array.from({ length: PIECES }, (_, i) => {
        const angle = (spread(i, 1) - 0.5) * Math.PI * 0.9;
        const power = 140 + spread(i, 2) * 160;
        const style = {
          "--x": `${Math.sin(angle) * power * 1.3}px`,
          "--y": `${-Math.cos(angle) * power}px`,
          "--r": `${(spread(i, 3) - 0.5) * 900}deg`,
          background: COLORS[i % COLORS.length],
          width: 6 + spread(i, 4) * 5,
          height: spread(i, 5) > 0.5 ? 6 : 12,
          borderRadius: spread(i, 6) > 0.7 ? "9999px" : "2px",
          animation: `confetti ${1100 + spread(i, 7) * 700}ms cubic-bezier(0.2, 0.7, 0.4, 1) ${spread(i, 8) * 120}ms both`,
        } as CSSProperties;
        return <span key={i} className="absolute left-1/2 top-[78%]" style={style} />;
      })}
    </div>
  );
}
