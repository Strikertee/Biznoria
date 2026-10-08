import { useState } from "react";
import { can, type Role } from "../authz";
import { useCashflow, useForecast, useHealth, useSme } from "../api/hooks";
import type { Horizon, Trend } from "../api/types";
import { Accounts } from "../components/Accounts";
import { CreditReadiness } from "../components/CreditReadiness";
import { LoanSimulator } from "../components/LoanSimulator";
import { CashflowChart, ForecastChart } from "../components/charts";
import { Activity, Gauge, Info, Lock, ShieldCheck, Sparkles, TrendDown, TrendUp } from "../components/icons";
import {
  Badge,
  Card,
  Empty,
  ErrorState,
  Loading,
  QueryState,
  ScoreBar,
  SectorPill,
  SizePill,
  Stat,
  fmtCompact,
  fmtNGN,
  fmtPct,
  toneForScore,
  type Tone,
} from "../components/ui";

const STATUS_TONE: Record<string, Tone> = { healthy: "emerald", watch: "amber", risk: "risk" };
const TREND_TONE: Record<Trend, Tone> = {
  growing: "emerald",
  stable: "neutral",
  declining: "risk",
  volatile: "amber",
};
const FORECAST_TONE: Record<string, Tone> = {
  healthy: "emerald",
  watch: "amber",
  high_pressure: "risk",
};

function Health({ smeId }: { smeId: string }) {
  const { data, isLoading, isError, error, refetch } = useHealth(smeId);

  return (
    <QueryState
      isLoading={isLoading}
      isError={isError}
      error={error}
      refetch={refetch}
      isEmpty={!data}
      loadingLabel="Loading health metrics…"
      emptyMessage="No health metrics available."
    >
      {() => {
        const h = data!;
        const maxShare = Math.max(...h.top_expense_categories.map((c) => c.share), 0.0001);
        return (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {/* Score + components */}
            <Card
              title="Financial health"
              action={
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Badge tone={STATUS_TONE[h.status] ?? "neutral"}>{h.status}</Badge>
                  <Badge tone={TREND_TONE[h.trend]}>
                    {h.trend === "declining" || h.trend === "volatile" ? (
                      <TrendDown size={11} />
                    ) : (
                      <TrendUp size={11} />
                    )}
                    {h.trend}
                  </Badge>
                </div>
              }
            >
              <div className="flex items-baseline gap-2">
                <span className="tnum text-3xl font-bold tracking-tight text-white">
                  {h.health_score.toFixed(1)}
                </span>
                <span className="text-sm text-ink-500">/100 composite</span>
              </div>
              <div className="mt-2">
                <ScoreBar value={h.health_score} tone={toneForScore(h.health_score)} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <Stat label="Stability" value={h.stability.toFixed(1)} tone={toneForScore(h.stability)} />
                <Stat label="Liquidity" value={h.liquidity.toFixed(1)} tone={toneForScore(h.liquidity)} />
                <Stat
                  label="Revenue consistency"
                  value={h.revenue_consistency.toFixed(1)}
                  tone={toneForScore(h.revenue_consistency)}
                />
                <Stat
                  label="Repayment"
                  value={h.repayment_score.toFixed(1)}
                  tone={toneForScore(h.repayment_score)}
                />
                <Stat label="Expense ratio" value={h.expense_ratio.toFixed(2)} />
                <Stat label="Growth" value={h.growth.toFixed(1)} tone={toneForScore(h.growth)} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ink-800 pt-4">
                <div>
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                    <TrendUp size={12} className="text-emerald-400" />
                    Avg monthly inflow
                  </p>
                  <p className="tnum mt-1 text-sm font-bold text-emerald-400">
                    {fmtCompact(h.avg_monthly_inflow)}
                  </p>
                </div>
                <div>
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                    <TrendDown size={12} className="text-red-400" />
                    Avg monthly outflow
                  </p>
                  <p className="tnum mt-1 text-sm font-bold text-red-400">
                    {fmtCompact(h.avg_monthly_outflow)}
                  </p>
                </div>
              </div>
            </Card>

            {/* Plain-language insights */}
            <Card
              title="Insights"
              subtitle="Generated from computed metrics only"
              action={
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/25">
                  <Sparkles size={14} />
                </span>
              }
            >
              <ul className="space-y-3">
                {h.insights.map((text) => (
                  <li key={text} className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                    <span className="text-sm leading-relaxed text-ink-300">{text}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Expense mix */}
            <Card title="Top expense categories" subtitle="Share of total outflow">
              {h.top_expense_categories.length === 0 ? (
                <Empty message="No expense categories recorded." />
              ) : (
                <ul className="space-y-3.5">
                  {h.top_expense_categories.map((c) => (
                    <li key={c.category}>
                      <div className="mb-1 flex items-baseline justify-between gap-3">
                        <span className="text-xs font-medium capitalize text-ink-300">
                          {c.category.replace("_", " ")}
                        </span>
                        <span className="tnum text-xs text-ink-500">
                          {fmtNGN(c.amount)} · {fmtPct(c.share * 100)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-wema-500 to-wema-300 transition-all duration-700 ease-premium"
                          style={{ width: `${(c.share / maxShare) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        );
      }}
    </QueryState>
  );
}

function Cashflow({ smeId }: { smeId: string }) {
  const { data, isLoading, isError, error, refetch } = useCashflow(smeId);

  return (
    <QueryState
      isLoading={isLoading}
      isError={isError}
      error={error}
      refetch={refetch}
      isEmpty={!data || data.points.length === 0}
      loadingLabel="Loading cash flow…"
      emptyMessage="No cash-flow history for this SME yet."
    >
      {() => {
        const series = data!;
        const points = series.points;
        const last = points[points.length - 1];
        const totalIn = points.reduce((a, p) => a + p.inflow, 0);
        const totalOut = points.reduce((a, p) => a + p.outflow, 0);
        return (
          <Card
            title="Cash flow — daily net"
            subtitle={`${points.length} days of history · ${series.data_sources.join(" + ")}`}
            action={
              <div className="flex items-center gap-2">
                {series.data_sources.includes("external") && (
                  <Badge tone="emerald">Unified authorised data</Badge>
                )}
                <Badge tone={last.net >= 0 ? "emerald" : "risk"}>
                  Latest {fmtCompact(last.net)}
                </Badge>
              </div>
            }
          >
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="Total inflow" value={fmtCompact(totalIn)} tone="emerald" />
              <Stat label="Total outflow" value={fmtCompact(totalOut)} tone="risk" />
              <Stat
                label="Net over period"
                value={fmtCompact(totalIn - totalOut)}
                tone={totalIn - totalOut >= 0 ? "emerald" : "risk"}
              />
            </div>
            <CashflowChart points={points} />
          </Card>
        );
      }}
    </QueryState>
  );
}

function ForecastPanel({ smeId }: { smeId: string }) {
  const [horizon, setHorizon] = useState<Horizon>(90);
  const fc = useForecast(smeId, horizon);
  const hist = useCashflow(smeId);
  const loading = fc.isLoading || hist.isLoading;
  const err = fc.isError ? fc.error : hist.isError ? hist.error : null;
  const retry = fc.isError ? fc.refetch : hist.refetch;

  return (
    <QueryState
      isLoading={loading}
      isError={err != null}
      error={err}
      refetch={retry}
      isEmpty={!fc.data || fc.data.points.length === 0 || !hist.data}
      loadingLabel="Loading forecast…"
      emptyMessage="No forecast available for this SME yet."
    >
      {() => {
        const forecast = fc.data!;
        const history = hist.data!;
        return (
          <Card
            title="Cash-flow forecast"
            subtitle="Estimates only — never a guarantee of future balances"
            action={
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Badge tone={FORECAST_TONE[forecast.status] ?? "neutral"}>
                  <Activity size={11} />
                  {forecast.status.replace("_", " ")}
                </Badge>
                <div className="flex gap-1 rounded-xl border border-ink-800 bg-ink-950/60 p-1">
                  {([30, 60, 90] as Horizon[]).map((h) => (
                    <button
                      key={h}
                      onClick={() => setHorizon(h)}
                      aria-pressed={horizon === h}
                      className={`focus-ring rounded-lg px-2.5 py-1 text-xs font-bold transition-all duration-300 ease-premium ${
                        horizon === h
                          ? "bg-emerald-500 text-ink-950 shadow-glow-emerald"
                          : "text-ink-400 hover:text-ink-100"
                      }`}
                    >
                      {h}d
                    </button>
                  ))}
                </div>
              </div>
            }
          >
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Horizon" value={`${forecast.horizon}d`} />
              <Stat label="History" value={`${forecast.history_len}d`} />
              <Stat
                label="Projected mean / day"
                value={fmtCompact(forecast.projected_mean_net)}
                tone={forecast.projected_mean_net >= 0 ? "emerald" : "risk"}
              />
              <Stat
                label="Projected worst day"
                value={fmtCompact(forecast.projected_min_net)}
                tone={forecast.projected_min_net >= 0 ? "emerald" : "risk"}
              />
            </div>

            <ForecastChart history={history.points} forecast={forecast} />

            {forecast.drivers.length > 0 && (
              <div className="mt-4 border-t border-ink-800 pt-4">
                <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500">
                  <Gauge size={12} />
                  Key drivers
                </p>
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {forecast.drivers.map((d) => (
                    <li key={d} className="flex items-start gap-2 text-xs text-ink-400">
                      <Info size={13} className="mt-0.5 shrink-0 text-ink-600" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        );
      }}
    </QueryState>
  );
}

export function SmeDetail({
  smeId,
  role,
  onBack,
}: {
  smeId: string;
  role: Role;
  onBack?: () => void;
}) {
  const { data, isLoading, isError, error, refetch } = useSme(smeId);

  return (
    <div className="space-y-6">
      {role === "sme" && (
        <div className="surface flex items-start gap-3 border-emerald-500/20 bg-emerald-500/[.05] p-4">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-400" />
          <p className="text-sm text-emerald-100/90">
            Review-only view — your cash flow, financial health, forecast and prototype credit
            readiness, provided for loan-review transparency.
          </p>
        </div>
      )}

      {/* Business header */}
      {isLoading ? (
        <Loading label="Loading business…" />
      ) : isError ? (
        <ErrorState
          message={error instanceof Error ? error.message : "Request failed"}
          onRetry={refetch}
        />
      ) : !data ? (
        <Empty message="Business not found." />
      ) : (
        <div className="surface relative overflow-hidden p-5">
          <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-emerald-500/[.08] blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              {onBack && (
                <button
                  onClick={onBack}
                  className="focus-ring mb-2 text-xs font-semibold text-ink-500 transition-colors hover:text-emerald-300"
                >
                  ← Back to portfolio
                </button>
              )}
              <h1 className="truncate text-2xl font-bold tracking-tight text-white">{data.name}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <SectorPill sector={data.sector} />
                <SizePill band={data.size_band} />
                <span className="text-xs capitalize text-ink-400">{data.region}</span>
                <span className="text-xs text-ink-600">· customer since {data.joined_on}</span>
              </div>
            </div>
            <span className="rounded-lg border border-ink-800 bg-ink-950/50 px-2.5 py-1 font-mono text-[11px] text-ink-500">
              {data.id}
            </span>
          </div>
        </div>
      )}

      {can(role, "health") && <Health smeId={smeId} />}
      {can(role, "cashflow") && <Cashflow smeId={smeId} />}
      {can(role, "forecast") && <ForecastPanel smeId={smeId} />}
      {can(role, "credit") && <CreditReadiness smeId={smeId} />}
      {can(role, "accounts") && <Accounts smeId={smeId} />}

      {can(role, "simulate") ? (
        <LoanSimulator smeId={smeId} />
      ) : (
        <Card title="Loan simulator">
          <div className="flex items-start gap-3 rounded-xl border border-ink-800 bg-ink-950/40 p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/5 text-ink-500 ring-1 ring-inset ring-white/10">
              <Lock size={15} />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink-200">Officer-only surface</p>
              <p className="mt-0.5 text-xs text-ink-500">
                The loan what-if simulator is available to your account officer.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
