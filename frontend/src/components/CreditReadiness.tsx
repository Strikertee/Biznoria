import { useCredit } from "../api/hooks";
import { Card, ErrorState, Loading, Empty, ScoreBar } from "./ui";

const LABELS: Record<string, string> = {
  stability: "Cash-flow stability (25%)",
  revenue_consistency: "Revenue consistency (20%)",
  growth: "Growth trend (20%)",
  repayment: "Repayment behaviour (20%)",
  liquidity: "Forecast liquidity (15%)",
};

export function CreditReadiness({ smeId }: { smeId: string }) {
  const { data, isLoading, isError, error, refetch } = useCredit(smeId);
  if (isLoading) return <Loading label="Scoring credit readiness…" />;
  if (isError) return <ErrorState message={error instanceof Error ? error.message : "Request failed"} onRetry={refetch} />;
  if (!data) return <Empty message="No credit score available." />;

  return (
    <Card title="Credit readiness — prototype">
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-wema-600 text-2xl font-bold text-white">
          {data.score.toFixed(0)}
        </div>
        <div className="text-sm text-slate-600">
          <p className="font-semibold text-wema-800">Score {data.score.toFixed(1)} / 100</p>
          <p>Transparent weighted sum — no black box.</p>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {Object.entries(data.components).map(([k, v]) => (
          <div key={k}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="font-medium text-slate-700">{LABELS[k] ?? k}</span>
              <span className="font-bold text-wema-800">{v.toFixed(1)}</span>
            </div>
            <ScoreBar value={v} />
          </div>
        ))}
      </div>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-600">
        {data.reasons.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
      <p className="mt-3 rounded-lg bg-wema-50 p-2 text-xs text-wema-800">{data.disclaimer}</p>
    </Card>
  );
}
