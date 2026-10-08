import { useState } from "react";
import { useApplication, useRecommend } from "../api/hooks";
import type { RecommendationValue } from "../api/types";
import { ApplicationStatusBadge, RecommendationBadge } from "../components/ApplicationBadges";
import { AlertTriangle, ChevronLeft, Coins, ShieldCheck, Target } from "./../components/icons";
import { SmeDetail } from "./SmeDetail";
import {
  Badge,
  Button,
  Card,
  Empty,
  ErrorState,
  Loading,
  Stat,
  fmtNGN,
} from "../components/ui";

const OPTIONS: readonly { value: RecommendationValue; label: string; hint: string }[] = [
  {
    value: "recommend_for_review",
    label: "Recommend for credit review",
    hint: "The evidence supports taking this to a human credit decision.",
  },
  {
    value: "request_more_information",
    label: "Request more information",
    hint: "Something is missing before this request can be assessed.",
  },
  {
    value: "flag_for_monitoring",
    label: "Flag for monitoring",
    hint: "Not ready now — keep the business under review and revisit.",
  },
];

function RecommendationForm({ appId }: { appId: string }) {
  const [choice, setChoice] = useState<RecommendationValue | null>(null);
  const [note, setNote] = useState("");
  const recommend = useRecommend(appId);

  return (
    <div>
      <p className="label-micro text-ink-500">Record a recommendation</p>
      <p className="mt-1 text-xs text-ink-500">
        This is the officer&apos;s output. It prepares the request for human credit review — the
        platform does not approve or decline.
      </p>

      <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-3">
        {OPTIONS.map((o) => {
          const active = choice === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => setChoice(o.value)}
              aria-pressed={active}
              className={`focus-ring rounded-xl border p-3 text-left transition-all duration-300 ease-premium ${
                active
                  ? "border-emerald-500/50 bg-emerald-500/[.07] ring-1 ring-emerald-500/25"
                  : "border-ink-800 bg-ink-950/40 hover:border-ink-700 hover:bg-white/[.03]"
              }`}
            >
              <span
                className={`flex items-center gap-1.5 text-xs font-semibold ${
                  active ? "text-emerald-300" : "text-ink-200"
                }`}
              >
                <Target size={13} />
                {o.label}
              </span>
              <span className="mt-1 block text-[11px] leading-relaxed text-ink-500">{o.hint}</span>
            </button>
          );
        })}
      </div>

      <label className="mt-3 block text-xs font-medium text-ink-400">
        Supporting note
        <input
          type="text"
          value={note}
          maxLength={400}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Stable inflows and a comfortable 90-day forecast cushion"
          className="focus-ring mt-1 w-full rounded-xl border border-ink-800 bg-ink-950/60 px-3 py-2 text-sm text-ink-100 transition-colors duration-300 hover:border-ink-700"
        />
      </label>

      {recommend.isError && (
        <p
          className="mt-3 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/[.07] p-3 text-xs text-red-200"
          role="alert"
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {recommend.error instanceof Error ? recommend.error.message : "Could not record it"}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[11px] text-ink-600">
          <ShieldCheck size={13} />
          Decision support only — not Wema underwriting
        </p>
        <Button
          variant="primary"
          disabled={!choice || recommend.isPending}
          onClick={() => choice && recommend.mutate({ recommendation: choice, note })}
        >
          <Coins size={14} />
          {recommend.isPending ? "Recording…" : "Record recommendation"}
        </Button>
      </div>
    </div>
  );
}

export function ApplicationReview({ appId, onBack }: { appId: string; onBack: () => void }) {
  const { data, isLoading, isError, error, refetch } = useApplication(appId);

  if (isLoading) return <Loading label="Loading the request…" />;
  if (isError)
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Request failed"}
        onRetry={refetch}
      />
    );
  if (!data) return <Empty message="That request could not be found." />;

  const recorded = data.status === "recommendation_recorded" && data.recommendation !== null;

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="focus-ring inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 transition-colors hover:text-emerald-300"
      >
        <ChevronLeft size={14} />
        Back to the queue
      </button>

      <Card
        title={`Facility request · ${data.id}`}
        subtitle={`${data.sme_name} · submitted ${data.submitted_at.slice(0, 10)}`}
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <ApplicationStatusBadge status={data.status} label={data.status_label} />
            {recorded && data.recommendation && data.recommendation_label && (
              <RecommendationBadge
                recommendation={data.recommendation}
                label={data.recommendation_label}
              />
            )}
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Requested" value={fmtNGN(data.amount)} tone="emerald" />
          <Stat label="Term" value={`${data.term_months} months`} />
          <Stat label="Indicative rate" value={`${(data.annual_rate * 100).toFixed(1)}% p.a.`} />
          <Stat label="Est. monthly repayment" value={fmtNGN(data.monthly_repayment)} />
        </div>

        {data.purpose && (
          <p className="mt-3 rounded-xl border border-ink-800 bg-ink-950/40 p-3 text-xs text-ink-300">
            <span className="text-ink-500">Stated purpose: </span>
            {data.purpose}
          </p>
        )}

        <div className="mt-5 border-t border-ink-800 pt-5">
          {recorded && data.recommendation && data.recommendation_label ? (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[.06] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="emerald">
                  <ShieldCheck size={11} />
                  Recommendation recorded
                </Badge>
                <span className="text-xs text-ink-400">
                  {data.recommendation_at?.slice(0, 10)} · by {data.reviewed_by}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold text-emerald-200">
                {data.recommendation_label}
              </p>
              {data.recommendation_note && (
                <p className="mt-1 text-xs leading-relaxed text-ink-300">
                  {data.recommendation_note}
                </p>
              )}
              <p className="mt-3 text-[11px] text-ink-500">{data.disclaimer}</p>
            </div>
          ) : (
            <RecommendationForm appId={appId} />
          )}
        </div>
      </Card>

      <div className="border-t border-ink-800 pt-6">
        <p className="label-micro mb-4 text-ink-500">
          Supporting intelligence — {data.sme_name}
        </p>
        <SmeDetail smeId={data.sme_id} role="officer" />
      </div>
    </div>
  );
}
