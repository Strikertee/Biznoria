import { useAccounts } from "../api/hooks";
import type { Account, ConsentStatus } from "../api/types";
import { Bank, Check, Hourglass, Lock, X } from "./icons";
import { Badge, Card, Empty, ErrorState, Loading } from "./ui";

const CONSENT_TONE: Record<ConsentStatus, "emerald" | "amber" | "risk" | "neutral"> = {
  active: "emerald",
  expired: "amber",
  revoked: "risk",
  not_connected: "neutral",
};

const CONSENT_ICON: Record<ConsentStatus, typeof Check> = {
  active: Check,
  expired: Hourglass,
  revoked: X,
  not_connected: Lock,
};

function AccountRow({ account }: { account: Account }) {
  const isInternal = account.source === "internal";
  const status = account.consent_status;
  const Icon = CONSENT_ICON[status];

  return (
    <li className="surface-hover rounded-xl border border-ink-800 bg-ink-950/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${
              isInternal
                ? "bg-wema-500/10 text-wema-300 ring-wema-500/25"
                : "bg-emerald-500/10 text-emerald-400 ring-emerald-500/25"
            }`}
          >
            <Bank size={16} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink-100">{account.label}</p>
            <p className="truncate text-xs text-ink-500">
              {account.institution_name} · {account.account_type} · {account.masked_account}
            </p>
            {account.consent_expires_at && (
              <p className="mt-1 truncate font-mono text-[10px] text-ink-600">
                consent until {account.consent_expires_at.slice(0, 10)}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Badge tone={isInternal ? "brand" : "emerald"}>
            {isInternal ? "Internal" : "Authorised external"}
          </Badge>
          <Badge tone={CONSENT_TONE[status]}>
            <Icon size={11} />
            {status.replace("_", " ")}
          </Badge>
          {account.is_primary && <Badge tone="neutral">Primary</Badge>}
        </div>
      </div>
    </li>
  );
}

export function Accounts({ smeId }: { smeId: string }) {
  const { data, isLoading, isError, error, refetch } = useAccounts(smeId);

  if (isLoading) return <Loading label="Loading connected accounts…" />;
  if (isError)
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Request failed"}
        onRetry={refetch}
      />
    );
  if (!data || data.length === 0) return <Empty message="No accounts connected." />;

  const external = data.filter((a) => a.source === "authorised_external");
  const unified = external.some((a) => a.consent_status === "active");

  return (
    <Card
      title="Connected accounts & consent"
      subtitle={
        unified
          ? "Metrics combine Wema-native data with customer-authorised external data."
          : "Metrics are based on Wema-native data only."
      }
      action={
        <Badge tone={unified ? "emerald" : "neutral"}>
          {unified ? "Unified view" : "Wema only"}
        </Badge>
      }
    >
      <ul className="space-y-3">
        {data.map((a) => (
          <AccountRow key={a.id} account={a} />
        ))}
      </ul>

      <p className="mt-4 rounded-xl border border-ink-800 bg-ink-950/40 p-3 text-[11px] leading-relaxed text-ink-500">
        External data appears only with the customer&apos;s approval, via a read-only token for a
        limited window. The customer can revoke access at any time — expired or revoked consents
        contribute no data.
      </p>
    </Card>
  );
}
