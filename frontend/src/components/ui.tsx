import type { ReactNode } from "react";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Info, RefreshCw } from "./icons";

/* ------------------------------------------------------------------ format */

export const fmtNGN = (v: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(v);

/** Compact currency for KPI headlines: ₦87.0M, ₦1.20B. */
export const fmtCompact = (v: number) => {
  const a = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (a >= 1e9) return `${sign}₦${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${sign}₦${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${sign}₦${(a / 1e3).toFixed(1)}K`;
  return `${sign}₦${a.toFixed(0)}`;
};

export const fmtPct = (v: number, digits = 1) => `${v.toFixed(digits)}%`;

/* ------------------------------------------------------------------ tokens */

export type Tone = "emerald" | "risk" | "amber" | "neutral" | "brand";

const TONE_TEXT: Record<Tone, string> = {
  emerald: "text-emerald-400",
  risk: "text-red-400",
  amber: "text-amber-400",
  neutral: "text-white",
  brand: "text-wema-300",
};

const TONE_BADGE: Record<Tone, string> = {
  emerald: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/25",
  risk: "bg-red-500/10 text-red-300 ring-red-500/25",
  amber: "bg-amber-500/10 text-amber-300 ring-amber-500/25",
  neutral: "bg-white/5 text-ink-300 ring-white/10",
  brand: "bg-wema-500/15 text-wema-300 ring-wema-500/30",
};

const TONE_BAR: Record<Tone, string> = {
  emerald: "bg-emerald-400",
  risk: "bg-red-500",
  amber: "bg-amber-400",
  neutral: "bg-ink-400",
  brand: "bg-wema-400",
};

/** Maps a 0-100 score onto a semantic tone (matches the frozen credit bands). */
export const toneForScore = (v: number): Tone =>
  v >= 75 ? "emerald" : v >= 55 ? "brand" : v >= 35 ? "amber" : "risk";

/* ------------------------------------------------------------------ layout */

export function Card({
  title,
  subtitle,
  action,
  children,
  className = "",
  padded = true,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={`surface ${padded ? "p-5" : ""} ${className}`}>
      {(title || action) && (
        <div className={`mb-4 flex items-start justify-between gap-3 ${padded ? "" : "p-5 pb-0"}`}>
          <div>
            {title && (
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                {title}
              </h2>
            )}
            {subtitle && <p className="mt-1 text-xs text-ink-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Large KPI tile. Hierarchy comes from type scale and a hairline accent, not
 *  from glow — the blurred-halo treatment is a machine-generated tell. */
export function StatCard({
  label,
  value,
  icon,
  delta,
  sub,
  tone = "neutral",
  pulse = false,
  className = "",
  hero = false,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  delta?: { value: string; up: boolean } | null;
  sub?: string;
  tone?: Tone;
  pulse?: boolean;
  className?: string;
  hero?: boolean;
}) {
  const accent =
    tone === "risk" ? "bg-red-500/60" : tone === "emerald" ? "bg-emerald-500/60" : "bg-ink-600";

  return (
    <div
      className={`surface surface-hover relative overflow-hidden p-5 ${
        pulse ? "animate-pulse-risk border-red-500/40" : ""
      } ${className}`}
    >
      <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-px ${accent}`} />

      <div className="flex items-start justify-between gap-3">
        <p className="label-micro text-ink-500">{label}</p>
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${
            tone === "risk"
              ? "bg-red-500/10 text-red-400 ring-red-500/25"
              : tone === "emerald"
                ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/25"
                : "bg-white/[.04] text-ink-400 ring-white/10"
          }`}
        >
          {icon}
        </span>
      </div>

      <p
        className={`figure-xl mt-4 font-bold ${hero ? "text-[2.75rem]" : "text-[2rem]"} ${TONE_TEXT[tone]}`}
      >
        {value}
      </p>

      <div className="mt-3 flex items-center gap-2">
        {delta && <Delta value={delta.value} up={delta.up} />}
        {sub && <span className="truncate text-xs text-ink-500">{sub}</span>}
      </div>
    </div>
  );
}

export function Delta({ value, up }: { value: string; up: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
        up ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/25" : "bg-red-500/10 text-red-300 ring-red-500/25"
      }`}
    >
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {value}
    </span>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1 ring-inset ${TONE_BADGE[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/* Sector + size pills. Full class strings so Tailwind can see them. */
const SECTOR_TONE: Record<string, string> = {
  fashion: "bg-rose-500/10 text-rose-300 ring-rose-500/25",
  retail: "bg-sky-500/10 text-sky-300 ring-sky-500/25",
  food: "bg-amber-500/10 text-amber-300 ring-amber-500/25",
  "tech-services": "bg-violet-500/10 text-violet-300 ring-violet-500/25",
  logistics: "bg-cyan-500/10 text-cyan-300 ring-cyan-500/25",
  agro: "bg-lime-500/10 text-lime-300 ring-lime-500/25",
};

export function SectorPill({ sector }: { sector: string }) {
  const cls = SECTOR_TONE[sector] ?? "bg-white/5 text-ink-300 ring-white/10";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${cls}`}
    >
      {sector}
    </span>
  );
}

const SIZE_TONE: Record<string, string> = {
  micro: "bg-white/5 text-ink-400 ring-white/10",
  small: "bg-white/[.07] text-ink-300 ring-white/15",
  medium: "bg-white/10 text-ink-200 ring-white/20",
};

export function SizePill({ band }: { band: string }) {
  const cls = SIZE_TONE[band] ?? "bg-white/5 text-ink-400 ring-white/10";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${cls}`}
    >
      {band}
    </span>
  );
}

/* ------------------------------------------------------------------ buttons */

export function Button({
  children,
  onClick,
  variant = "outline",
  size = "md",
  disabled = false,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const base =
    "focus-ring inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition-all duration-300 ease-premium disabled:cursor-not-allowed disabled:opacity-45";
  const sizes = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
  const variants = {
    primary:
      "bg-emerald-500 text-ink-950 shadow-glow-emerald hover:bg-emerald-400 hover:shadow-[0_0_0_1px_rgba(16,185,129,.6),0_12px_34px_-10px_rgba(16,185,129,.65)]",
    outline:
      "border border-ink-700 text-ink-200 hover:border-emerald-500/60 hover:text-emerald-300 hover:shadow-glow-emerald hover:bg-emerald-500/[.06]",
    ghost: "text-ink-300 hover:bg-white/5 hover:text-white",
  }[variant];

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${sizes} ${variants} ${className}`}>
      {children}
    </button>
  );
}

/** Sliding capsule toggle — the thumb glides between the two options. */
export function SegmentedToggle<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  label?: string;
}) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div className="flex items-center gap-3">
      {label && <span className="hidden text-xs font-medium text-ink-400 sm:inline">{label}</span>}
      <div
        aria-label={label}
        className="relative flex rounded-full border border-ink-800 bg-ink-950/70 p-1 backdrop-blur"
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-1 rounded-full bg-emerald-500/90 shadow-glow-emerald transition-transform duration-300 ease-premium"
          style={{ width: `calc((100% - 0.5rem) / ${options.length})`, transform: `translateX(${index * 100}%)`, left: "0.25rem" }}
        />
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={`focus-ring relative z-10 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors duration-300 sm:px-4 ${
              value === o.value ? "text-ink-950" : "text-ink-400 hover:text-ink-100"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ states */

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-ink-800/60 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[.06] to-transparent" />
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="surface flex items-center gap-3 p-5" role="status" aria-live="polite">
      <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-ink-700 border-t-emerald-400" />
      <span className="text-sm text-ink-400">{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="surface border-red-500/30 p-5" role="alert">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400 ring-1 ring-inset ring-red-500/25">
          <AlertTriangle size={16} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-red-200">Something went wrong</p>
          <p className="mt-1 break-words text-xs text-ink-400">{message}</p>
          <Button variant="outline" size="sm" onClick={onRetry} className="mt-3">
            <RefreshCw size={13} />
            Retry
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Empty({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-ink-800 bg-ink-950/40 px-6 py-8 text-center">
      <Info size={18} className="text-ink-600" />
      <p className="text-sm text-ink-500">{message}</p>
    </div>
  );
}

export function ScoreBar({ value, tone }: { value: number; tone?: Tone }) {
  const resolved = tone ?? toneForScore(value);
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-800">
      <div
        className={`h-full rounded-full transition-all duration-700 ease-premium ${TONE_BAR[resolved]}`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

/** Small labelled metric tile used inside panels. */
export function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: Tone;
}) {
  return (
    <div className="rounded-xl border border-ink-800 bg-ink-950/50 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-500">{label}</p>
      <p className={`tnum mt-1 text-lg font-bold ${TONE_TEXT[tone]}`}>{value}</p>
    </div>
  );
}

/**
 * Guards a query result. `children` MUST be a render function: JSX children are
 * evaluated eagerly by the caller, so `<QueryState>{data!.x}</QueryState>` would
 * dereference `data` before the loading guard runs and blank the page.
 */
export function QueryState({
  isLoading,
  isError,
  error,
  refetch,
  isEmpty,
  loadingLabel,
  emptyMessage,
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
  isEmpty: boolean;
  loadingLabel: string;
  emptyMessage: string;
  children: () => ReactNode;
}) {
  if (isLoading) return <Loading label={loadingLabel} />;
  if (isError)
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Request failed"}
        onRetry={refetch}
      />
    );
  if (isEmpty) return <Empty message={emptyMessage} />;
  return <>{children()}</>;
}
