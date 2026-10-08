import { useCredit } from "../api/hooks";
import type { CreditReadiness as CreditData } from "../api/types";
import { Check, Info, ShieldCheck, TrendUp } from "./icons";
import { Badge, Card, Empty, ErrorState, Loading, ScoreBar, toneForScore, type Tone } from "./ui";

const COMPONENT_LABELS: Record<string, string> = {
  stability: "Cash-flow stability",
  revenue_consistency: "Revenue consistency",
  growth: "Growth trend",
  repayment: "Repayment behaviour",
  liquidity: "Forecast liquidity",
};
const COMPONENT_ORDER = ["stability", "revenue_consistency", "growth", "repayment", "liquidity"] as const;

const BAND_TONE: Record<string, Tone> = {
  strong: "emerald",
  developing: "brand",
  emerging: "amber",
  fragile: "risk",
};

const RING_COLOR: Record<Tone, string> = {
  emerald: "#10B981",
  brand: "#9A72C8",
  amber: "#F59E0B",
  risk: "#EF4444",
  neutral: "#6B7280",
};

function ScoreRing({ score, tone }: { score: number; tone: Tone }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.max(0, Math.min(100, score)) / 100) * circumference;

  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#1F2937" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={RING_COLOR[tone]}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference - filled}`}
          className="transition-all duration-1000 ease-premium"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tnum text-3xl font-bold tracking-tight text-white">{score.toFixed(0)}</span>
        <span className="text-[10px] uppercase tracking-widest text-ink-500">/ 100</span>
      </div>
    </div>
  );
}

function DriverList({ title, items, tone }: { title: string; items: string[]; tone: Tone }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500">{title}</p>
      <ul className="space-y-1.5">
        {items.map((d) => (
          <li key={d} className="flex items-start gap-2 text-xs text-ink-400">
            <Check
              size={13}
              className={`mt-0.5 shrink-0 ${tone === "emerald" ? "text-emerald-400" : "text-red-400"}`}
            />
            <span>{d}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Body({ data }: { data: CreditData }) {
  const tone = BAND_TONE[data.band] ?? toneForScore(data.score);

  return (
    <>
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <ScoreRing score={data.score} tone={tone} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={tone}>
              <TrendUp size={11} />
              {data.band}
            </Badge>
            <span className="text-xs text-ink-500">Transparent weighted sum — no black box</span>
          </div>
          <div className="mt-4 space-y-3">
            {COMPONENT_ORDER.map((key) => {
              const value = data.components[key];
              const weight = data.weights[key];
              return (
                <div key={key}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
                    <span className="text-ink-400">
                      {COMPONENT_LABELS[key]}{" "}
                      {weight != null && (
                        <span className="text-ink-600">({Math.round(weight * 100)}%)</span>
                      )}
                    </span>
                    <span className="tnum font-semibold text-ink-100">{value.toFixed(1)}</span>
                  </div>
                  <ScoreBar value={value} tone={toneForScore(value)} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {(data.positive_drivers.length > 0 || data.negative_drivers.length > 0) && (
        <div className="mt-5 grid grid-cols-1 gap-4 border-t border-ink-800 pt-5 sm:grid-cols-2">
          <DriverList title="Positive drivers" items={data.positive_drivers} tone="emerald" />
          <DriverList title="Watch items" items={data.negative_drivers} tone="risk" />
        </div>
      )}

      <div className="mt-5 border-t border-ink-800 pt-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500">
          What the numbers say
        </p>
        <ul className="space-y-1.5">
          {data.reasons.map((r) => (
            <li key={r} className="flex items-start gap-2 text-xs text-ink-400">
              <Info size={13} className="mt-0.5 shrink-0 text-ink-600" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[.06] p-3 text-[11px] leading-relaxed text-amber-200/90">
        <ShieldCheck size={14} className="mt-0.5 shrink-0 text-amber-400" />
        {data.disclaimer}
      </p>
    </>
  );
}

export function CreditReadiness({ smeId }: { smeId: string }) {
  const { data, isLoading, isError, error, refetch } = useCredit(smeId);

  if (isLoading) return <Loading label="Scoring credit readiness…" />;
  if (isError)
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Request failed"}
        onRetry={refetch}
      />
    );
  if (!data) return <Empty message="No credit score available." />;

  return (
    <Card title="Credit readiness — prototype" subtitle="Decision support, not an underwriting decision">
      <Body data={data} />
    </Card>
  );
}
