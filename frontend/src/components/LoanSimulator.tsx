import { useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSimulate } from "../api/hooks";
import type { Impact } from "../api/types";
import { AlertTriangle, Coins, Hourglass, ShieldCheck, TrendDown } from "./icons";
import { Badge, Button, Card, fmtCompact, fmtNGN, type Tone } from "./ui";

const IMPACT_TONE: Record<Impact, Tone> = {
  manageable: "emerald",
  watch: "amber",
  high_pressure: "risk",
};

const IMPACT_NOTE: Record<Impact, string> = {
  manageable: "No material deterioration in projected liquidity.",
  watch: "Noticeable reduction in buffer — worth monitoring.",
  high_pressure: "Projected liquidity approaches or falls below zero.",
};

const PRESETS = [500_000, 2_000_000, 5_000_000];

const inputCls =
  "focus-ring w-full rounded-xl border border-ink-800 bg-ink-950/60 px-3 py-2 text-sm text-ink-100 transition-colors duration-300 hover:border-ink-700";

function ComparisonRow({
  label,
  baseline,
  projected,
}: {
  label: string;
  baseline: number;
  projected: number;
}) {
  const delta = projected - baseline;
  const worse = delta < 0;
  return (
    <div className="rounded-xl border border-ink-800 bg-ink-950/40 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-500">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="tnum text-sm text-ink-500 line-through decoration-ink-700">
          {fmtCompact(baseline)}
        </span>
        <span className="text-ink-600">→</span>
        <span className={`tnum text-lg font-bold ${worse ? "text-red-400" : "text-emerald-400"}`}>
          {fmtCompact(projected)}
        </span>
      </div>
      <p className={`tnum mt-0.5 text-[11px] ${worse ? "text-red-400/80" : "text-emerald-400/80"}`}>
        {delta >= 0 ? "+" : ""}
        {fmtCompact(delta)} vs no-loan
      </p>
    </div>
  );
}

export function LoanSimulator({ smeId }: { smeId: string }) {
  const [amount, setAmount] = useState(2_000_000);
  const [annualRate, setAnnualRate] = useState(0.24);
  const [termMonths, setTermMonths] = useState(12);
  const sim = useSimulate(smeId);

  const canRun = amount > 0 && annualRate >= 0 && annualRate <= 1 && termMonths > 0;
  const result = sim.data;

  return (
    <Card
      title="Loan what-if simulator"
      subtitle="Officer only · projects repayment against the 90-day forecast"
      action={
        <Button
          variant="primary"
          size="sm"
          disabled={sim.isPending || !canRun}
          onClick={() => sim.mutate({ amount, annual_rate: annualRate, term_months: termMonths })}
        >
          <Coins size={14} />
          {sim.isPending ? "Simulating…" : "Run simulation"}
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="text-xs font-medium text-ink-400">
          Amount (₦)
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className={`mt-1 ${inputCls}`}
          />
        </label>
        <label className="text-xs font-medium text-ink-400">
          Annual rate (e.g. 0.24)
          <input
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={annualRate}
            onChange={(e) => setAnnualRate(Number(e.target.value))}
            className={`mt-1 ${inputCls}`}
          />
        </label>
        <label className="text-xs font-medium text-ink-400">
          Term (months)
          <input
            type="number"
            min={1}
            max={120}
            value={termMonths}
            onChange={(e) => setTermMonths(Number(e.target.value))}
            className={`mt-1 ${inputCls}`}
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-ink-600">Quick amounts:</span>
        {PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => setAmount(preset)}
            className={`focus-ring rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all duration-300 ease-premium ${
              amount === preset
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                : "border-ink-800 text-ink-400 hover:border-ink-700 hover:text-ink-200"
            }`}
          >
            {fmtCompact(preset)}
          </button>
        ))}
      </div>

      {sim.isError && (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/[.07] p-3 text-xs text-red-200" role="alert">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          Simulation failed: {sim.error instanceof Error ? sim.error.message : "request failed"}
        </p>
      )}

      {!result && !sim.isError && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-ink-800 bg-ink-950/40 p-4 text-xs text-ink-500">
          <Hourglass size={14} className="text-ink-600" />
          Set the terms and run the simulation to see the projected liquidity impact.
        </div>
      )}

      {result && (
        <div className="mt-5 space-y-4 animate-fade-up">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={IMPACT_TONE[result.impact]} className="px-3 py-1 text-xs">
              <TrendDown size={12} />
              {result.impact_label}
            </Badge>
            <span className="text-xs text-ink-500">{IMPACT_NOTE[result.impact]}</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-ink-800 bg-ink-950/40 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                Monthly repayment
              </p>
              <p className="tnum mt-1 text-lg font-bold text-white">
                {fmtNGN(result.monthly_repayment)}
              </p>
            </div>
            <ComparisonRow
              label="Projected mean liquidity"
              baseline={result.baseline_mean_liquidity}
              projected={result.projected_mean_liquidity}
            />
            <ComparisonRow
              label="Projected minimum liquidity"
              baseline={result.baseline_min_liquidity}
              projected={result.projected_min_liquidity}
            />
          </div>

          <div className="h-[220px] rounded-xl border border-ink-800 bg-ink-950/30 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={result.series.map((p) => ({
                  date: p.date.slice(5),
                  projected: p.projected_net,
                  baseline: p.baseline_net,
                }))}
                margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  minTickGap={32}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  width={56}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ stroke: "#1F2937" }}
                  contentStyle={{
                    background: "rgba(17,24,39,.96)",
                    border: "1px solid #374151",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#9CA3AF", fontSize: 10 }}
                />
                <ReferenceLine y={0} stroke="#374151" />
                <Line
                  type="monotone"
                  dataKey="baseline"
                  name="No loan"
                  stroke="#6B7280"
                  strokeDasharray="4 4"
                  dot={false}
                  strokeWidth={1.5}
                />
                <Line
                  type="monotone"
                  dataKey="projected"
                  name="With loan"
                  stroke="#10B981"
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <p className="flex items-start gap-2 rounded-xl border border-ink-800 bg-ink-950/40 p-3 text-[11px] leading-relaxed text-ink-500">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-ink-600" />
            {result.disclaimer}
          </p>
        </div>
      )}
    </Card>
  );
}
