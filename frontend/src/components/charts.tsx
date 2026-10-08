import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CashflowPoint, Forecast } from "../api/types";

const tick = { fontSize: 11, fill: "#6b7280" };

export function CashflowChart({ points }: { points: CashflowPoint[] }) {
  const data = points.map((p) => ({ date: p.date.slice(5), inflow: p.inflow, outflow: p.outflow, net: p.net }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ede4f6" />
        <XAxis dataKey="date" tick={tick} minTickGap={28} />
        <YAxis tick={tick} width={64} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)} />
        <Tooltip />
        <Area type="monotone" dataKey="net" name="Net" stroke="#5c2d91" fill="#ede4f6" strokeWidth={2} />
        <Line type="monotone" dataKey="inflow" name="Inflow" stroke="#16a34a" dot={false} strokeWidth={1.5} />
        <Line type="monotone" dataKey="outflow" name="Outflow" stroke="#dc2626" dot={false} strokeWidth={1.5} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function ForecastChart({ history, forecast }: { history: CashflowPoint[]; forecast: Forecast }) {
  const tail = history.slice(-30).map((p) => ({ date: p.date.slice(5), actual: p.net, yhat: null as number | null }));
  const preds = forecast.points.map((p) => ({ date: p.date.slice(5), actual: null as number | null, yhat: p.yhat }));
  const data = [...tail, ...preds];
  return (
    <div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ede4f6" />
          <XAxis dataKey="date" tick={tick} minTickGap={28} />
          <YAxis tick={tick} width={64} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)} />
          <Tooltip />
          <Line type="monotone" dataKey="actual" name="Actual net" stroke="#5c2d91" dot={false} strokeWidth={2} connectNulls={false} />
          <Line
            type="monotone"
            dataKey="yhat"
            name={`Forecast (${forecast.model_used})`}
            stroke="#9a72c8"
            strokeDasharray="6 3"
            dot={false}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-1 text-xs text-slate-500">
        Model: {forecast.model_used}
        {forecast.mae_val != null ? ` · validation MAE ₦${forecast.mae_val.toLocaleString()}` : " · short history, baseline"} · dashed =
        forecast
      </p>
    </div>
  );
}
