import { useState } from "react";
import { useSmeApplications, useSubmitApplication } from "../api/hooks";
import { AlertTriangle, Coins, ShieldCheck, Target } from "./icons";
import { ApplicationStatusBadge, RecommendationBadge } from "./ApplicationBadges";
import {
  Badge,
  Button,
  Card,
  Empty,
  ErrorState,
  Loading,
  fmtNGN,
  type Tone,
} from "./ui";

const inputCls =
  "focus-ring w-full rounded-xl border border-ink-800 bg-ink-950/60 px-3 py-2 text-sm text-ink-100 transition-colors duration-300 hover:border-ink-700";

const PRESETS = [500_000, 2_000_000, 5_000_000];
const TERMS = [6, 12, 18, 24, 36];

function RequestList({ smeId }: { smeId: string }) {
  const { data, isLoading, isError, error, refetch } = useSmeApplications(smeId);

  if (isLoading) return <Loading label="Loading your requests…" />;
  if (isError)
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Request failed"}
        onRetry={refetch}
      />
    );
  if (!data || data.length === 0)
    return <Empty message="You have not requested a facility yet." />;

  return (
    <ul className="space-y-3">
      {data.map((a) => (
        <li key={a.id} className="rounded-xl border border-ink-800 bg-ink-950/40 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="tnum text-lg font-bold text-white">{fmtNGN(a.amount)}</span>
                <span className="text-xs text-ink-500">
                  over {a.term_months} months · {(a.annual_rate * 100).toFixed(1)}% p.a.
                </span>
              </div>
              {a.purpose && <p className="mt-1 text-xs text-ink-400">{a.purpose}</p>}
              <p className="mt-1.5 font-mono text-[10px] text-ink-600">
                {a.id} · submitted {a.submitted_at.slice(0, 10)} · est. repayment{" "}
                {fmtNGN(a.monthly_repayment)}/mo
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <ApplicationStatusBadge status={a.status} label={a.status_label} />
              {a.recommendation && a.recommendation_label && (
                <RecommendationBadge
                  recommendation={a.recommendation}
                  label={a.recommendation_label}
                />
              )}
            </div>
          </div>
          {a.recommendation_note && (
            <p className="mt-3 rounded-lg border border-ink-800 bg-ink-950/60 p-2.5 text-xs text-ink-300">
              <span className="text-ink-500">Officer note: </span>
              {a.recommendation_note}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

function RequestForm({ smeId }: { smeId: string }) {
  const [amount, setAmount] = useState(2_000_000);
  const [annualRate, setAnnualRate] = useState(0.24);
  const [termMonths, setTermMonths] = useState(12);
  const [purpose, setPurpose] = useState("");
  const [consent, setConsent] = useState(false);
  const submit = useSubmitApplication(smeId);

  const valid =
    amount > 0 && annualRate >= 0 && annualRate <= 1 && termMonths > 0 && termMonths <= 120;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid || !consent) return;
        submit.mutate({ amount, annual_rate: annualRate, term_months: termMonths, purpose, consent });
      }}
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
        <span className="text-[11px] text-ink-600">Amount:</span>
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setAmount(p)}
            className={`focus-ring rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all duration-300 ease-premium ${
              amount === p
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                : "border-ink-800 text-ink-400 hover:border-ink-700 hover:text-ink-200"
            }`}
          >
            {fmtNGN(p)}
          </button>
        ))}
        <span className="ml-2 text-[11px] text-ink-600">Term:</span>
        {TERMS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTermMonths(t)}
            className={`focus-ring rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all duration-300 ease-premium ${
              termMonths === t
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                : "border-ink-800 text-ink-400 hover:border-ink-700 hover:text-ink-200"
            }`}
          >
            {t}mo
          </button>
        ))}
      </div>

      <label className="mt-4 block text-xs font-medium text-ink-400">
        Purpose
        <input
          type="text"
          value={purpose}
          maxLength={240}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="e.g. Additional stock for the festive season"
          className={`mt-1 ${inputCls}`}
        />
      </label>

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-ink-800 bg-ink-950/40 p-3">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="focus-ring mt-0.5 h-4 w-4 shrink-0 rounded border-ink-700 bg-ink-950 accent-emerald-500"
        />
        <span>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-200">
            <ShieldCheck size={13} className="text-emerald-400" />
            I authorise read-only account and transaction access
          </span>
          <span className="mt-1 block text-[11px] leading-relaxed text-ink-500">
            For this application, Biznoria may read my other bank accounts on a read-only basis
            for a limited window. No payments can be initiated, and I can revoke access at any
            time.
          </span>
        </span>
      </label>

      {submit.isError && (
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/[.07] p-3 text-xs text-red-200" role="alert">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {submit.error instanceof Error ? submit.error.message : "Could not submit the request"}
        </p>
      )}

      {submit.isSuccess && (
        <p className="mt-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[.07] p-3 text-xs text-emerald-200">
          Request {submit.data.id} submitted. Your account officer can now review it.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-ink-600">
          Decision support only — this is not an approval or a decline.
        </p>
        <Button
          type="submit"
          variant="primary"
          disabled={!valid || !consent || submit.isPending}
        >
          <Coins size={14} />
          {submit.isPending ? "Submitting…" : "Submit request"}
        </Button>
      </div>
    </form>
  );
}

export function LoanApplicationPanel({ smeId }: { smeId: string }) {
  const { data } = useSmeApplications(smeId);
  const open = (data ?? []).filter((a) => a.status !== "recommendation_recorded").length;

  return (
    <div className="space-y-6">
      <Card
        title="Your facility requests"
        subtitle="Track what you have asked for and what the bank has recorded"
        action={
          open > 0 ? (
            <Badge tone={"amber" as Tone}>{open} open</Badge>
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[.04] text-ink-400 ring-1 ring-inset ring-white/10">
              <Target size={14} />
            </span>
          )
        }
      >
        <RequestList smeId={smeId} />
      </Card>

      <Card
        title="Request a facility"
        subtitle="Submitting triggers the secure, read-only data-sharing prompt"
      >
        <RequestForm smeId={smeId} />
      </Card>
    </div>
  );
}
