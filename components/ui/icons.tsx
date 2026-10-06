import { useId, type SVGProps } from "react";
import type { ChallengeType } from "@/lib/challenges";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 24, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/** A W traced through five dots, like a connect-the-dots puzzle; the gold dot is today's. Mirrors `app/icon.svg`. */
export function WittoMark({ size = 32, ...props }: IconProps) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <defs>
        <linearGradient id={id} x1="2" y1="0" x2="22" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#9b7ff7" />
          <stop offset="1" stopColor="#5c3cc6" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="5.5" fill={`url(#${id})`} />
      <polyline
        points="4.44,7.68 8.22,16.32 12,9.84 15.78,16.32 19.56,7.68"
        fill="none"
        stroke="#fff"
        strokeWidth={1.84}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g fill="#fff">
        <circle cx="4.44" cy="7.68" r="1.89" />
        <circle cx="8.22" cy="16.32" r="1.89" />
        <circle cx="12" cy="9.84" r="1.89" />
        <circle cx="15.78" cy="16.32" r="1.89" />
      </g>
      <circle cx="19.56" cy="7.68" r="1.89" fill="#ffd27a" />
    </svg>
  );
}

export function FlameIcon({ size = 28, ...props }: IconProps) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <defs>
        <linearGradient id={id} x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--flame-from)" />
          <stop offset="1" stopColor="var(--flame-to)" />
        </linearGradient>
      </defs>
      <path
        d="M12.6 2.2c.6 3.3-1.1 5.1-2.8 6.9C8.1 10.9 6 13 6 15.9A6 6 0 0 0 18 16c0-2.8-1.2-4.8-2.6-6.2-.2 1.4-.9 2.4-2 2.8.6-3.6-.2-7.4-.8-10.4z"
        fill={`url(#${id})`}
      />
      <path
        d="M12.2 13.2c-1.6 1.4-2.6 2.6-2.6 4.1a2.4 2.4 0 0 0 4.8 0c0-1.3-.8-2.4-2.2-4.1z"
        fill="#ffd27a"
        opacity="0.9"
      />
    </svg>
  );
}

export const CheckIcon = (p: IconProps) => (
  <Base strokeWidth={2.2} {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Base>
);

export const CloseIcon = (p: IconProps) => (
  <Base strokeWidth={2} {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Base>
);

export const LightbulbIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
    <path d="M9 18h6M10 21.5h4" />
  </Base>
);

export const WordIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="3.5" width="18" height="17" rx="2.5" />
    <text
      x="12"
      y="15.6"
      textAnchor="middle"
      fontSize="9"
      fontWeight="500"
      fill="currentColor"
      stroke="none"
      fontFamily="ui-sans-serif, system-ui, sans-serif"
    >
      Aa
    </text>
  </Base>
);

export const CalculatorIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="5" y="2.5" width="14" height="19" rx="2" />
    <rect x="8" y="5.5" width="8" height="3" rx="0.5" />
    <path d="M9 12h.01M12 12h.01M15 12h.01M9 15h.01M12 15h.01M15 15h.01M9 18h.01M12 18h.01M15 18h.01" strokeWidth={2.2} />
  </Base>
);

export const BookIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M2 4.5h6a4 4 0 0 1 4 4V21a3 3 0 0 0-3-3H2z" />
    <path d="M22 4.5h-6a4 4 0 0 0-4 4V21a3 3 0 0 1 3-3h7z" />
  </Base>
);

export const GridIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
  </Base>
);

export const BeeIcon = (p: IconProps) => (
  <Base {...p}>
    <ellipse cx="12" cy="14.5" rx="4" ry="5.5" />
    <path d="M8.3 12.5h7.4M8.1 15.8h7.8M12 20v1.5" />
    <path d="M10.4 9.6C8.6 6.8 5.3 6 4.1 7.6c-1.3 1.8.6 4.4 4.3 4.2" />
    <path d="M13.6 9.6c1.8-2.8 5.1-3.6 6.3-2 1.3 1.8-.6 4.4-4.3 4.2" />
    <path d="M10.5 4.5 11.3 7M13.5 4.5 12.7 7" />
  </Base>
);

export const RingsIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="9" cy="12" r="6" />
    <circle cx="15" cy="12" r="6" />
  </Base>
);

export const HomeIcon = (p: IconProps) => (
  <svg width={p.size ?? 24} height={p.size ?? 24} viewBox="0 0 24 24" aria-hidden="true" className={p.className}>
    <path d="M3 10.4 12 3l9 7.4V20a1.2 1.2 0 0 1-1.2 1.2H15v-6H9v6H4.2A1.2 1.2 0 0 1 3 20z" fill="currentColor" />
  </svg>
);

export const PodiumIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M9 21V8h6v13M3 21v-8h6M15 21v-5h6v5M2 21h20" />
  </Base>
);

export const SunIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Base>
);

export const MoonIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M20.5 14.1A8.5 8.5 0 1 1 9.9 3.5a6.6 6.6 0 0 0 10.6 10.6z" />
  </Base>
);

export const ShuffleIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" />
    <path d="m18 2 4 4-4 4" />
    <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2" />
    <path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8" />
    <path d="m18 14 4 4-4 4" />
  </Base>
);

export const BackspaceIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 5H9l-7 7 7 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" />
    <path d="m12 9 6 6M18 9l-6 6" />
  </Base>
);

export const ClockIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Base>
);

export const CrownIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z" />
  </Base>
);

export const EyeIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </Base>
);

export const EyeOffIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-2.6 3.5M6.6 6.6A16.6 16.6 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M2 2l20 20" />
  </Base>
);

export const TYPE_ICONS: Record<ChallengeType, (p: IconProps) => React.ReactElement> = {
  word: WordIcon,
  math: CalculatorIcon,
  riddle: LightbulbIcon,
  fact: BookIcon,
  crossword: GridIcon,
  bee: BeeIcon,
  connections: RingsIcon,
};
