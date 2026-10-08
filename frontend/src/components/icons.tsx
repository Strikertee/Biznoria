/**
 * Inline SVG icon set — stroke-based, 24x24, inherits `currentColor`.
 * Deliberately no emoji: they render differently per OS, can't be themed,
 * and don't scale cleanly.
 */
import type { ReactNode, SVGProps } from "react";

type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number };

function Base({ size = 16, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const TrendUp = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 17l6-6 4 4 8-8" />
    <path d="M21 7h-6" />
    <path d="M21 7v6" />
  </Base>
);

export const TrendDown = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 7l6 6 4-4 8 8" />
    <path d="M21 17h-6" />
    <path d="M21 17v-6" />
  </Base>
);

export const ArrowUpRight = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 17L17 7" />
    <path d="M8 7h9v9" />
  </Base>
);

export const ArrowDownRight = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 7l10 10" />
    <path d="M17 8v9H8" />
  </Base>
);

export const Wallet = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1" />
    <path d="M3 8v9a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H5" />
    <circle cx="16.5" cy="14.5" r="1.15" fill="currentColor" stroke="none" />
  </Base>
);

export const Activity = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 12h3.5l2.5-7 4 14 2.5-7H21" />
  </Base>
);

export const Gauge = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 21a9 9 0 1 0-9-9" />
    <path d="M12 12l4.5-4.5" />
    <path d="M3 12h2" />
  </Base>
);

export const ShieldCheck = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3l7 3v5.5c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6l7-3z" />
    <path d="M9.2 12.2l2 2 3.6-3.9" />
  </Base>
);

export const LayoutGrid = (p: IconProps) => (
  <Base {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
  </Base>
);

export const Rows = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 6h16" />
    <path d="M4 12h16" />
    <path d="M4 18h16" />
  </Base>
);

export const ChevronRight = (p: IconProps) => (
  <Base {...p}>
    <path d="M9 6l6 6-6 6" />
  </Base>
);

export const ChevronLeft = (p: IconProps) => (
  <Base {...p}>
    <path d="M15 6l-6 6 6 6" />
  </Base>
);

export const AlertTriangle = (p: IconProps) => (
  <Base {...p}>
    <path d="M10.3 3.9L2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    <path d="M12 9v4" />
    <circle cx="12" cy="16.6" r=".9" fill="currentColor" stroke="none" />
  </Base>
);

export const Info = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <circle cx="12" cy="8" r=".9" fill="currentColor" stroke="none" />
  </Base>
);

export const Check = (p: IconProps) => (
  <Base {...p}>
    <path d="M4.5 12.5l5 5 10-11" />
  </Base>
);

export const X = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 6l12 12" />
    <path d="M18 6L6 18" />
  </Base>
);

export const Bank = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 9.5L12 4l9 5.5" />
    <path d="M5 10v8" />
    <path d="M9.5 10v8" />
    <path d="M14.5 10v8" />
    <path d="M19 10v8" />
    <path d="M3 20h18" />
  </Base>
);

export const Lock = (p: IconProps) => (
  <Base {...p}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </Base>
);

export const Coins = (p: IconProps) => (
  <Base {...p}>
    <ellipse cx="9" cy="7" rx="5.5" ry="2.6" />
    <path d="M3.5 7v4c0 1.44 2.46 2.6 5.5 2.6s5.5-1.16 5.5-2.6V7" />
    <path d="M14.5 11.4c2.4.3 6 1.3 6 3.2 0 1.44-2.46 2.6-5.5 2.6-2.3 0-4.3-.7-5.1-1.7" />
  </Base>
);

export const Sparkles = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" />
    <path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z" />
  </Base>
);

export const RefreshCw = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 11a8 8 0 0 0-14.3-4.6" />
    <path d="M4 13a8 8 0 0 0 14.3 4.6" />
    <path d="M20 5v6h-6" />
    <path d="M4 19v-6h6" />
  </Base>
);

export const Building = (p: IconProps) => (
  <Base {...p}>
    <rect x="4.5" y="3.5" width="10" height="17" rx="1.6" />
    <path d="M14.5 9.5H20v11" />
    <path d="M3 20.5h18" />
    <path d="M8 8h3M8 12h3M8 16h3" />
  </Base>
);

export const Search = (p: IconProps) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </Base>
);

export const SlidersHorizontal = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 7h10M18 7h2" />
    <path d="M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </Base>
);

export const Download = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 4v10" />
    <path d="M8 10.5l4 4 4-4" />
    <path d="M4.5 19.5h15" />
  </Base>
);

export const Target = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
  </Base>
);

export const Hourglass = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 3.5h10" />
    <path d="M7 20.5h10" />
    <path d="M8 3.5v3.2c0 2 4 3.3 4 5.3s-4 3.3-4 5.3v3.2" />
    <path d="M16 3.5v3.2c0 2-4 3.3-4 5.3s4 3.3 4 5.3v3.2" />
  </Base>
);

export const LogOut = (p: IconProps) => (
  <Base {...p}>
    <path d="M14.5 4.5H18a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-3.5" />
    <path d="M10 8l-4 4 4 4" />
    <path d="M6 12h9" />
  </Base>
);
