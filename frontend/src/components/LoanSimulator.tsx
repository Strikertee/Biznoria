import { useState } from "react";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSimulate } from "../api/hooks";
import { Card, fmtNGN } from "./ui";

export function LoanSimulator({ smeId }: { smeId: string }) {
  const [amount, setAmount] = useState(500000);
  const [annualRate, setAnnualRate] = useState(0.24);
  const [termMonths, setTermMonths] = useState(12);
  const sim = useSimulate(smeId);

  const input =
    "w-full rounded-lg border border-wema-200 px-3 py-2 text-sm focus:border-wema-600 focus:outline-none";

  return (
    <Card
      title="Loan what-if simulator — officer only"
      action={
        <button
          onClick={() => sim.mutate({ amount, annual_rate: annualRate, term_months: termMonths })}
          disabled={sim.isPending}
          className="rounded-lg bg-wema-600 px-4 py-2 text-sm font-bold text-white hover:bg-wema-700 disabled:opacity-50"
        >
          {sim.isPending ? "Simulating…" : "Run simulation"}
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="text-xs font-medium text-slate-600">
          Amount (₦)
          <input type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className={input} />
        </label>
        <label className="text-xs font-medium text-slate-600">
          Annual rate (e.g. 0.24)
          <input
            type="number"
            min={0}
            step={0.01}
            value={annualRate}
            onChange={(e) => setAnnualRate(Number(e.target.value))}
            className={input}
          />
        </label>
        <label className="text-xs font-medium text-slate-600">
          Term (months)
          <input
            type="number"
            min={1}
            value={termMonths}
            onChange={(e) => setTermMonths(Number(e.target.value))}
            className={input}
          />
        </label>
      </div>

      {sim.isError && (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
          Simulation failed: {sim.error instanceof Error ? sim.error.message : "request failed"}
        </p>
      )}

      {sim.data && (
        <div className="mt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-wema-50 p-3">
              <p className="text-xs uppercase text-wema-700">Monthly repayment</p>
              <p className="text-xl font-bold text-wema-900">{fmtNGN(sim.data.monthly_repayment)}</p>
            </div>
            <div className="rounded-lg bg-wema-50 p-3">
              <p className="text-xs uppercase text-wema-700">Projected min liquidity</p>
              <p className="text-xl font-bold text-wema-900">{fmtNGN(sim.data.projected_min_liquidity)}</p>
            </div>
            <div className="rounded-lg bg-wema-50 p-3">
              <p className="text-xs uppercase text-wema-700">Projected mean liquidity</p>
              <p className="text-xl font-bold text-wema-900">{fmtNGN(sim.data.projected_mean_liquidity)}</p>
            </div>
          </div>
          <div className="mt-3" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={sim.data.series.map((p) => ({ date: p.date.slice(5), net: p.projected_net }))}
                margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#ede4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7280" }} minTickGap={28} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} width={64} />
                <Tooltip />
                <Line type="monotone" dataKey="net" name="Projected net" stroke="#5c2d91" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 rounded-lg bg-wema-50 p-2 text-xs text-wema-800">{sim.data.disclaimer}</p>
        </div>
      )}
    </Card>
  );
}
