import type { CSSProperties, ReactElement, SVGProps } from "react";
import { cn } from "@/components/ui/cn";
import {
  BeeIcon,
  BoltIcon,
  CalendarCheckIcon,
  CompassIcon,
  CrownIcon,
  FlameGlyph,
  GemIcon,
  GridIcon,
  MedalIcon,
  RingsIcon,
  SnowflakeIcon,
  SparkleIcon,
  StarIcon,
  SunriseIcon,
  TargetIcon,
  TrophyIcon,
  WordIcon,
} from "@/components/ui/icons";
import type { Achievement, AchievementId, AchievementTone } from "@/lib/achievements";

type Icon = (p: SVGProps<SVGSVGElement> & { size?: number }) => ReactElement;

export const ACHIEVEMENT_ICONS: Record<AchievementId, Icon> = {
  first_solve: SparkleIcon,
  solves_10: StarIcon,
  solves_50: GemIcon,
  solves_100: TrophyIcon,
  points_1000: MedalIcon,
  all_types: CompassIcon,
  streak_3: FlameGlyph,
  streak_7: FlameGlyph,
  streak_30: FlameGlyph,
  streak_100: FlameGlyph,
  perfect_week: CalendarCheckIcon,
  freeze_saved: SnowflakeIcon,
  no_hints_10: TargetIcon,
  word_two: WordIcon,
  connections_flawless: RingsIcon,
  bee_pangram: BeeIcon,
  quick_60: BoltIcon,
  crossword_90: GridIcon,
  early_bird: SunriseIcon,
  daily_best: CrownIcon,
};

const TONES: Record<AchievementTone, { fill: string; glow: string }> = {
  brand: { fill: "bg-[image:var(--medal-brand)]", glow: "var(--medal-glow-brand)" },
  flame: { fill: "bg-[image:var(--medal-flame)]", glow: "var(--medal-glow-flame)" },
  frost: { fill: "bg-[image:var(--medal-frost)]", glow: "var(--medal-glow-frost)" },
  mint: { fill: "bg-[image:var(--medal-mint)]", glow: "var(--medal-glow-mint)" },
  gold: { fill: "bg-[image:var(--medal-gold)]", glow: "var(--medal-glow-gold)" },
};

/**
 * An achievement's medal. Earned ones are struck in their colour; locked ones are a faint outline, ringed with
 * their progress once the player has made a start. `celebrate` plays the unlock: a spin-in, a halo and a shine.
 */
export function Medal({
  achievement,
  size = 56,
  celebrate = false,
  className,
  style,
}: {
  achievement: Achievement;
  size?: number;
  celebrate?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const Icon = ACHIEVEMENT_ICONS[achievement.id];
  const tone = TONES[achievement.tone];
  const earned = achievement.earnedOn !== null;
  const ratio = achievement.progress / achievement.target;

  return (
    <span
      aria-hidden="true"
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size, ...style }}
    >
      {earned && celebrate && (
        <span
          className="absolute -inset-1/4 animate-medal-burst rounded-full"
          style={{ background: `radial-gradient(circle, ${tone.glow} 0%, transparent 65%)` }}
        />
      )}
      {earned ? (
        <span
          className={cn(
            "relative flex size-full items-center justify-center overflow-hidden rounded-full text-white",
            tone.fill,
            celebrate && "animate-medal-unlock",
          )}
          style={{
            boxShadow: `inset 0 1px 0 rgb(255 255 255 / 0.5), inset 0 -3px 6px rgb(0 0 0 / 0.14), 0 8px 16px -8px ${tone.glow}`,
          }}
        >
          {/* A struck rim, like the edge of a coin. */}
          <span className="absolute inset-[8%] rounded-full border border-white/35" />
          <Icon size={Math.round(size * 0.48)} strokeWidth={1.9} className="relative drop-shadow-[0_1px_1px_rgb(0_0_0/0.18)]" />
          {celebrate && (
            <span className="absolute inset-y-0 left-1/4 w-1/2 animate-medal-shine bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.7),transparent)]" />
          )}
        </span>
      ) : (
        <span
          className={cn(
            "relative flex size-full items-center justify-center rounded-full bg-surface-muted text-ink-faint",
            ratio === 0 && "border border-dashed border-line-strong",
          )}
        >
          <Icon size={Math.round(size * 0.44)} />
          {ratio > 0 && <ProgressRing ratio={ratio} size={size} />}
        </span>
      )}
    </span>
  );
}

function ProgressRing({ ratio, size }: { ratio: number; size: number }) {
  const stroke = Math.max(2.5, size / 20);
  const r = (size - stroke) / 2;
  const length = 2 * Math.PI * r;
  return (
    <svg className="absolute inset-0 -rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--brand)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={length}
        strokeDashoffset={length * (1 - Math.min(ratio, 1))}
        className="transition-[stroke-dashoffset] duration-700 ease-out"
      />
    </svg>
  );
}

/** A thin bar of progress towards a target. */
export function ProgressBar({
  progress,
  target,
  tone = "track",
  className,
}: {
  progress: number;
  target: number;
  /** "brand" for a bar sitting on the violet challenge wash. */
  tone?: "track" | "brand";
  className?: string;
}) {
  const ratio = Math.min(progress / Math.max(target, 1), 1);
  return (
    <span
      className={cn("block overflow-hidden rounded-full", tone === "brand" ? "h-2 bg-brand-soft" : "h-1.5 bg-track", className)}
      aria-hidden="true"
    >
      <span
        className="block h-full origin-left animate-underline rounded-full bg-brand transition-[width] duration-700 ease-out"
        style={{ width: `${Math.max(ratio * 100, ratio > 0 ? 4 : 0)}%` }}
      />
    </span>
  );
}
