import { useMemo, useState } from "react";
import { usePortfolio, useSmes } from "../api/hooks";
import type { PortfolioSummary } from "../api/types";
import {
  Activity,
  Building,
  Gauge,
  Search,
  SlidersHorizontal,
  Target,
  TrendDown,
  TrendUp,
} from "../components/icons";
import {
  Button,
  Card,
  Delta,
  Empty,
  ErrorState,
  ScoreBar,
  SectorPill,
  SizePill,
  Skeleton,
  fmtCompact,
  toneForScore,
} from "../components/ui";

function KpiSkeleton() {
  return (
    <div className="surface space-y-4 p-5">
      <div className="flex justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-8 rounded-xl" />
      </div>
      <Skeleton className="h-9 w-36" />
      <Skeleton className="h-3 w-28" />
    </div>
  );
}

function KpiRow({ p }: { p: PortfolioSummary }) {
  const total = p.total_inflow_30d + p.total_outflow_30d;
  const inflowShare = total > 0 ? (p.total_inflow_30d / total) * 100 : 50;
  const netPositive = p.net_flow_30d >= 0;
  const medianTone = toneForScore(p.median_health_score);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Hero: the one number that matters, with the inflow/outflow split inline
          rather than as two more identical cards. */}
      <div className="surface relative overflow-hidden p-6 lg:col-span-2">
        <span
          aria-hidden="true"
          className={`absolute inset-x-0 top-0 h-px ${netPositive ? "bg-emerald-500/60" : "bg-red-500/60"}`}
        />
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="label-micro text-ink-500">Net flow (30d)</p>
            <p
              className={`figure-xl mt-4 text-[2.75rem] font-bold sm:text-[3.25rem] ${
                netPositive ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {fmtCompact(p.net_flow_30d)}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Delta
                value={`${netPositive ? "+" : ""}${fmtCompact(p.net_flow_30d)}`}
                up={netPositive}
              />
              <span className="text-xs text-ink-500">
                across {p.sme_count} businesses · last 30 days
              </span>
            </div>
          </div>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/25">
            <Activity size={16} />
          </span>
        </div>

        <div className="mt-6 border-t border-ink-800 pt-5">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <p className="label-micro flex items-center gap-1.5 text-ink-600">
                <TrendUp size={12} className="text-emerald-400" />
                Inflow
              </p>
              <p className="tnum mt-1.5 text-lg font-bold text-emerald-400">
                {fmtCompact(p.total_inflow_30d)}
              </p>
            </div>
            <div className="text-right">
              <p className="label-micro flex items-center justify-end gap-1.5 text-ink-600">
                <TrendDown size={12} className="text-red-400" />
                Outflow
              </p>
              <p className="tnum mt-1.5 text-lg font-bold text-red-400">
                {fmtCompact(p.total_outflow_30d)}
              </p>
            </div>
          </div>
          <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-ink-800">
            <div
              className="h-full bg-emerald-500 transition-all duration-700 ease-premium"
              style={{ width: `${inflowShare}%` }}
            />
            <div className="h-full flex-1 bg-red-500/60" />
          </div>
          <p className="mt-2 text-[11px] text-ink-600">
            Inflow covers{" "}
            <span className="tnum font-semibold text-ink-400">{inflowShare.toFixed(1)}%</span> of
            total movement
          </p>
        </div>
      </div>

      {/* Median health */}
      <div className="surface relative overflow-hidden p-5">
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-ink-600" />
        <div className="flex items-start justify-between gap-3">
          <p className="label-micro text-ink-500">Median health score</p>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[.04] text-ink-400 ring-1 ring-inset ring-white/10">
            <Gauge size={15} />
          </span>
        </div>
        <p className="figure-xl mt-4 text-[2.25rem] font-bold text-white">
          {p.median_health_score.toFixed(1)}
          <span className="ml-1 text-sm font-medium text-ink-600">/100</span>
        </p>
        <div className="mt-4">
          <ScoreBar value={p.median_health_score} tone={medianTone} />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-500">
          Portfolio midpoint — {p.healthy_count} healthy, {p.watch_count} on watch,{" "}
          {p.at_risk_count} under pressure.
        </p>
      </div>
    </div>
  );
}

/** One divided strip instead of five more cards — keeps the KPI row dominant. */
function Composition({ p }: { p: PortfolioSummary }) {
  const cells: { label: string; value: number; tone: string; pulse?: boolean }[] = [
    { label: "Businesses", value: p.sme_count, tone: "text-white" },
    { label: "Healthy", value: p.healthy_count, tone: "text-emerald-400" },
    { label: "Watch", value: p.watch_count, tone: "text-amber-400" },
    { label: "High pressure", value: p.high_pressure_count, tone: "text-red-400", pulse: true },
    { label: "At risk", value: p.at_risk_count, tone: "text-red-400" },
  ];
  return (
    <div className="surface flex flex-col divide-y divide-ink-800 sm:flex-row sm:divide-x sm:divide-y-0">
      {cells.map((c) => (
        <div key={c.label} className="flex-1 p-4">
          <p className="label-micro text-ink-600">{c.label}</p>
          <p className={`tnum mt-2 text-2xl font-bold ${c.tone} ${c.pulse ? "animate-pulse" : ""}`}>
            {c.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function Portfolio({ onSelect }: { onSelect: (id: string) => void }) {
  const p = usePortfolio();
  const s = useSmes();
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const list = s.data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (x) =>
        x.name.toLowerCase().includes(q) ||
        x.sector.toLowerCase().includes(q) ||
        x.region.toLowerCase().includes(q) ||
        x.size_band.toLowerCase().includes(q),
    );
  }, [s.data, query]);

  return (
    <div className="space-y-6">
      {/* ---- KPI row ---- */}
      {p.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <KpiSkeleton />
          <KpiSkeleton />
          <KpiSkeleton />
        </div>
      ) : p.isError ? (
        <ErrorState
          message={p.error instanceof Error ? p.error.message : "Request failed"}
          onRetry={p.refetch}
        />
      ) : p.data ? (
        <>
          <KpiRow p={p.data} />
          <Composition p={p.data} />
        </>
      ) : (
        <Empty message="No portfolio data." />
      )}

      {/* ---- SME directory ---- */}
      <Card
        title="SME directory"
        subtitle="Synthetic businesses · click any row to open the full financial picture"
        padded={false}
        action={
          <div className="relative w-full max-w-xs">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, sector, region…"
              aria-label="Search SMEs"
              className="focus-ring w-full rounded-xl border border-ink-800 bg-ink-950/60 py-2 pl-9 pr-3 text-sm text-ink-100 placeholder:text-ink-600 transition-colors duration-300 hover:border-ink-700"
            />
          </div>
        }
      >
        <div className="px-5 pb-4">
          {s.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : s.isError ? (
            <ErrorState
              message={s.error instanceof Error ? s.error.message : "Request failed"}
              onRetry={s.refetch}
            />
          ) : rows.length === 0 ? (
            <Empty
              message={
                query ? `No businesses match “${query}”.` : "No SMEs found in this portfolio."
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-ink-800">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-ink-950/70 text-[10px] uppercase tracking-[0.14em] text-ink-500">
                    <th scope="col" className="px-5 py-3 font-semibold">Business</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Sector</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Size</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Region</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((sme, i) => (
                    <tr
                      key={sme.id}
                      onClick={() => onSelect(sme.id)}
                      className={`group cursor-pointer border-t border-ink-800/70 transition-colors duration-200 hover:bg-emerald-500/[.05] ${
                        i % 2 === 1 ? "bg-white/[.015]" : ""
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-ink-400 ring-1 ring-inset ring-white/10 transition-colors duration-200 group-hover:text-emerald-300 group-hover:ring-emerald-500/30">
                            <Building size={15} />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-ink-100">{sme.name}</p>
                            <p className="truncate font-mono text-[11px] text-ink-600">{sme.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <SectorPill sector={sme.sector} />
                      </td>
                      <td className="px-4 py-3.5">
                        <SizePill band={sme.size_band} />
                      </td>
                      <td className="px-4 py-3.5 capitalize text-ink-400">{sme.region}</td>
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onSelect(sme.id)}
                          className="opacity-90 group-hover:opacity-100"
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!s.isLoading && !s.isError && rows.length > 0 && (
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-ink-600">
              <span className="inline-flex items-center gap-1.5">
                <SlidersHorizontal size={13} />
                Showing <span className="tnum font-semibold text-ink-400">{rows.length}</span> of{" "}
                <span className="tnum font-semibold text-ink-400">{s.data?.length ?? 0}</span> businesses
              </span>
              <span className="hidden items-center gap-1.5 sm:inline-flex">
                <Target size={13} />
                Deterministic seed 42
              </span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
