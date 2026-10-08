import { usePortfolio, useSmes } from "../api/hooks";
import { Card, Empty, ErrorState, Loading, Stat, fmtNGN } from "../components/ui";

export function Portfolio({ onSelect }: { onSelect: (id: string) => void }) {
  const p = usePortfolio();
  const s = useSmes();

  return (
    <div className="space-y-4">
      {p.isLoading ? (
        <Loading label="Loading portfolio summary…" />
      ) : p.isError ? (
        <ErrorState message={p.error instanceof Error ? p.error.message : "Request failed"} onRetry={p.refetch} />
      ) : p.data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Stat label="SMEs" value={`${p.data.sme_count}`} />
          <Stat label="Net flow (30d)" value={fmtNGN(p.data.net_flow_30d)} />
          <Stat label="Median health" value={p.data.median_health_score.toFixed(1)} />
          <Stat label="Inflow (30d)" value={fmtNGN(p.data.total_inflow_30d)} />
          <Stat label="Outflow (30d)" value={fmtNGN(p.data.total_outflow_30d)} />
          <Stat label="At risk" value={`${p.data.at_risk_count}`} tone={p.data.at_risk_count > 0 ? "text-red-600" : undefined} />
        </div>
      ) : (
        <Empty message="No portfolio data." />
      )}

      <Card title="SMEs">
        {s.isLoading ? (
          <Loading label="Loading SMEs…" />
        ) : s.isError ? (
          <ErrorState message={s.error instanceof Error ? s.error.message : "Request failed"} onRetry={s.refetch} />
        ) : !s.data || s.data.length === 0 ? (
          <Empty message="No SMEs found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase text-wema-700">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Sector</th>
                  <th className="py-2 pr-4">Size</th>
                  <th className="py-2 pr-4">Region</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {s.data.map((sme) => (
                  <tr key={sme.id} className="border-t border-wema-50">
                    <td className="py-2 pr-4 font-semibold text-slate-800">{sme.name}</td>
                    <td className="py-2 pr-4 text-slate-600">{sme.sector}</td>
                    <td className="py-2 pr-4 text-slate-600">{sme.size_band}</td>
                    <td className="py-2 pr-4 text-slate-600">{sme.region}</td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => onSelect(sme.id)}
                        className="rounded-lg bg-wema-600 px-3 py-1.5 font-semibold text-white hover:bg-wema-700"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
