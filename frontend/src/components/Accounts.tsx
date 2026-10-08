import { useAccounts } from "../api/hooks";
import { Card, ErrorState, Loading, Empty } from "./ui";

export function Accounts({ smeId }: { smeId: string }) {
  const { data, isLoading, isError, error, refetch } = useAccounts(smeId);
  if (isLoading) return <Loading label="Loading connected accounts…" />;
  if (isError) return <ErrorState message={error instanceof Error ? error.message : "Request failed"} onRetry={refetch} />;
  if (!data || data.length === 0) return <Empty message="No accounts connected." />;

  return (
    <Card title="Connected accounts & consent">
      <ul className="space-y-2">
        {data.map((a) => (
          <li key={a.id} className="flex items-center justify-between rounded-lg border border-wema-100 p-3">
            <div>
              <p className="font-semibold text-slate-800">{a.label}</p>
              <p className="text-xs text-slate-500">
                {a.provider === "wema" ? "Wema Bank" : "External bank (mock)"}
                {a.consent_expires_at ? ` · consent until ${a.consent_expires_at}` : ""}
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                a.source === "internal" ? "bg-white text-wema-700 ring-1 ring-wema-300" : "bg-wema-600 text-white"
              }`}
            >
              {a.source === "internal" ? "Internal" : "Authorised external"}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-500">
        External data appears only with the customer's approval, via a read-only token for a limited window. The
        customer can revoke access at any time.
      </p>
    </Card>
  );
}
