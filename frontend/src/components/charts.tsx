import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CashflowPoint, Forecast } from "../api/types";
import { fmtCompact } from "./ui";

const AXIS_TICK = { fontSize: 11, fill: "#6B7280" };
const GRID = "#1F2937";
const EMERALD = "#10B981";
const EMERALD_SOFT = "#34D399";
const CRIMSON = "#F87171";
const VIOLET = "#9A72C8";

const shortDate = (iso: string) => iso.slice(5);
const compactTick = (v: number) =>
  Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : `${Math.round(v)}`;

type TooltipEntry = { name?: string; value?: number | string; color?: string; dataKey?: string };
type TooltipInjected = { active?: boolean; payload?: TooltipEntry[]; label?: string | number };

function DarkTooltip({ active, payload, label }: TooltipInjected) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-ink-700 bg-ink-900/97 px-3 py-2 shadow-card-hover backdrop-blur">
      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-500">{label}</p>
      {payload.map((entry) => {
        const raw = typeof entry.value === "number" ? entry.value : 0;
        // Outflow is plotted as a negative bar; show it as an absolute figure.
        const display = entry.dataKey === "outflow" ? Math.abs(raw) : raw;
        return (
          <p key={String(entry.name)} className="flex items-center gap-2 text-xs">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: entry.color }} />
            <span className="text-ink-400">{entry.name}</span>
            <span className="tnum ml-auto font-semibold text-ink-100">{fmtCompact(display)}</span>
          </p>
        );
      })}
    </div>
  );
}

function LegendChip({ color, label, dashed = false }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-500">
      <span
        className="h-1.5 w-4 rounded-full"
        style={
          dashed
            ? { backgroundImage: `repeating-linear-gradient(90deg, ${color} 0 5px, transparent 5px 9px)` }
            : { background: color }
        }
      />
      {label}
    </span>
  );
}

/**
 * 365 daily points are unreadable as bars, so anything longer than 90 points is
 * summed into equal buckets and the grain is surfaced in the legend.
 */
function bucketise(points: CashflowPoint[], maxBuckets = 60) {
  if (points.length <= maxBuckets) {
    return { rows: points.map((p) => ({ ...p })), grain: "daily" as const, size: 1 };
  }
  const size = Math.ceil(points.length / maxBuckets);
  const rows: CashflowPoint[] = [];
  for (let i = 0; i < points.length; i += size) {
    const slice = points.slice(i, i + size);
    rows.push({
      date: slice[0].date,
      inflow: slice.reduce((a, p) => a + p.inflow, 0),
      outflow: slice.reduce((a, p) => a + p.outflow, 0),
      net: slice.reduce((a, p) => a + p.net, 0),
    });
  }
  return { rows, grain: `${size}-day` as const, size };
}

export function CashflowChart({ points }: { points: CashflowPoint[] }) {
  const { rows, grain } = bucketise(points);
  const data = rows.map((p) => ({
    date: shortDate(p.date),
    inflow: p.inflow,
    outflow: -p.outflow, // plotted below zero so the two flows read as a spread
    net: p.net,
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={0}>
          <defs>
            <linearGradient id="inflowBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={EMERALD_SOFT} stopOpacity={0.95} />
              <stop offset="100%" stopColor={EMERALD} stopOpacity={0.55} />
            </linearGradient>
            <linearGradient id="outflowBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CRIMSON} stopOpacity={0.5} />
              <stop offset="100%" stopColor={CRIMSON} stopOpacity={0.9} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis dataKey="date" tick={AXIS_TICK} minTickGap={36} axisLine={false} tickLine={false} />
          <YAxis
            tick={AXIS_TICK}
            width={58}
            tickFormatter={compactTick}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(255,255,255,.03)" }} />
          <ReferenceLine y={0} stroke="#374151" />
          <Bar dataKey="inflow" name="Inflow" fill="url(#inflowBar)" radius={[2, 2, 0, 0]} maxBarSize={16} />
          <Bar dataKey="outflow" name="Outflow" fill="url(#outflowBar)" radius={[0, 0, 2, 2]} maxBarSize={16} />
          <Line
            type="monotone"
            dataKey="net"
            name="Net"
            stroke="#E5E7EB"
            strokeWidth={1.75}
            dot={false}
            strokeOpacity={0.9}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        <LegendChip color={EMERALD_SOFT} label="Inflow" />
        <LegendChip color={CRIMSON} label="Outflow" />
        <LegendChip color="#E5E7EB" label="Net" />
        <span className="text-[11px] text-ink-600">
          {grain === "daily" ? "Daily grain" : `${grain} buckets (365 daily points summed)`}
        </span>
      </div>
    </div>
  );
}

export function ForecastChart({ history, forecast }: { history: CashflowPoint[]; forecast: Forecast }) {
  const tail = history.slice(-45).map((p) => ({
    date: shortDate(p.date),
    actual: p.net as number | null,
    yhat: null as number | null,
  }));
  const preds = forecast.points.map((p) => ({
    date: shortDate(p.date),
    actual: null as number | null,
    yhat: p.yhat,
  }));
  // Join the forecast line to the last actual so there is no visual break.
  const bridge = tail.length
    ? [{ ...tail[tail.length - 1], yhat: tail[tail.length - 1].actual }]
    : [];
  const data = [...tail, ...bridge, ...preds];
  const cut = bridge[0]?.date;
  const last = data[data.length - 1]?.date;
  const worst = forecast.points.reduce(
    (acc, p) => (p.yhat < acc.yhat ? p : acc),
    forecast.points[0] ?? { date: "", yhat: 0 },
  );

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={VIOLET} stopOpacity={0.16} />
              <stop offset="100%" stopColor={VIOLET} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis dataKey="date" tick={AXIS_TICK} minTickGap={36} axisLine={false} tickLine={false} />
          <YAxis
            tick={AXIS_TICK}
            width={58}
            tickFormatter={compactTick}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<DarkTooltip />} cursor={{ stroke: "#374151" }} />
          <ReferenceLine y={0} stroke="#374151" />
          {cut && last && (
            <ReferenceArea
              x1={cut}
              x2={last}
              fill="url(#forecastBand)"
              stroke={VIOLET}
              strokeOpacity={0.25}
              strokeDasharray="3 3"
            />
          )}
          {worst.date && (
            <ReferenceLine
              y={worst.yhat}
              stroke={worst.yhat < 0 ? CRIMSON : EMERALD}
              strokeDasharray="2 4"
              strokeOpacity={0.55}
            />
          )}
          <Area
            type="monotone"
            dataKey="yhat"
            name={`Forecast (${forecast.model_used})`}
            stroke={VIOLET}
            fill="url(#forecastBand)"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="actual"
            name="Actual net"
            stroke={EMERALD_SOFT}
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        <LegendChip color={EMERALD_SOFT} label="Actual net (last 45d)" />
        <LegendChip color={VIOLET} label={`Forecast — ${forecast.model_used}`} dashed />
        <span className="text-[11px] text-ink-600">
          {worst.date
            ? `worst projected day ${shortDate(worst.date)} · ${fmtCompact(worst.yhat)}`
            : ""}
        </span>
        <span className="text-[11px] text-ink-600">
          {forecast.mae_val != null
            ? `validation MAE ${fmtCompact(forecast.mae_val)}`
            : "short history — baseline fallback"}
        </span>
      </div>
    </div>
  );
}
