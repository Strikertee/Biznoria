import { useState } from "react";
import { can, type Role } from "../authz";
import { useCashflow, useForecast, useHealth, useSme } from "../api/hooks";
import type { Horizon } from "../api/types";
import { Accounts } from "../components/Accounts";
import { CreditReadiness } from "../components/CreditReadiness";
import { LoanSimulator } from "../components/LoanSimulator";
import { CashflowChart, ForecastChart } from "../components/charts";
import { Card, Empty, ErrorState, Loading, QueryState, Stat } from "../components/ui";

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
      {() => (
        <Card title="Financial health">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Stat label="Stability" value={data!.stability.toFixed(1)} />
            <Stat label="Growth" value={data!.growth.toFixed(1)} />
            <Stat label="Liquidity" value={data!.liquidity.toFixed(1)} />
            <Stat label="Revenue consistency" value={data!.revenue_consistency.toFixed(1)} />
            <Stat label="Repayment" value={data!.repayment_score.toFixed(1)} />
            <Stat label="Expense ratio" value={data!.expense_ratio.toFixed(2)} />
          </div>
        </Card>
      )}
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
      {() => (
        <Card title="Cash flow — daily net">
          <CashflowChart points={data!.points} />
        </Card>
      )}
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
      {() => (
        <Card
          title="Cash-flow forecast"
          action={
            <div className="flex gap-1">
              {([30, 60, 90] as Horizon[]).map((h) => (
                <button
                  key={h}
                  onClick={() => setHorizon(h)}
                  className={`rounded-lg px-3 py-1 text-xs font-bold ${
                    horizon === h ? "bg-wema-600 text-white" : "bg-wema-50 text-wema-700 hover:bg-wema-100"
                  }`}
                >
                  {h}d
                </button>
              ))}
            </div>
          }
        >
          <ForecastChart history={hist.data!.points} forecast={fc.data!} />
        </Card>
      )}
    </QueryState>
  );
}

export function SmeDetail({ smeId, role, onBack }: { smeId: string; role: Role; onBack?: () => void }) {
  const { data, isLoading, isError, error, refetch } = useSme(smeId);

  return (
    <div className="space-y-4">
      {onBack && (
        <button onClick={onBack} className="text-sm font-semibold text-wema-700 hover:text-wema-800">
          ← Back to portfolio
        </button>
      )}
      {role === "sme" && (
        <div className="rounded-xl bg-wema-50 p-3 text-sm text-wema-800">
          Review-only view — your cash flow, health, forecast and credit readiness for loan review.
        </div>
      )}
      {isLoading ? (
        <Loading label="Loading business…" />
      ) : isError ? (
        <ErrorState message={error instanceof Error ? error.message : "Request failed"} onRetry={refetch} />
      ) : !data ? (
        <Empty message="Business not found." />
      ) : (
        <div className="rounded-xl bg-wema-600 p-4 text-white">
          <h1 className="text-xl font-bold">{data.name}</h1>
          <p className="text-sm text-wema-100">
            {data.sector} · {data.size_band} · {data.region} · customer since {data.joined_on}
          </p>
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
          <Empty message="The loan simulator is available to your account officer." />
        </Card>
      )}
    </div>
  );
}
