import type { ReactNode } from "react";
import type { ApplicationStatus, RecommendationValue } from "../api/types";
import { Check, Hourglass, Info, ShieldCheck } from "./icons";
import { Badge, type Tone } from "./ui";

const STATUS_TONE: Record<ApplicationStatus, Tone> = {
  submitted: "amber",
  under_review: "brand",
  recommendation_recorded: "emerald",
};

const STATUS_ICON: Record<ApplicationStatus, typeof Check> = {
  submitted: Hourglass,
  under_review: Info,
  recommendation_recorded: Check,
};

export function ApplicationStatusBadge({
  status,
  label,
}: {
  status: ApplicationStatus;
  label: string;
}) {
  const Icon = STATUS_ICON[status] ?? Info;
  return (
    <Badge tone={STATUS_TONE[status] ?? "neutral"}>
      <Icon size={11} />
      {label}
    </Badge>
  );
}

const RECOMMENDATION_TONE: Record<RecommendationValue, Tone> = {
  recommend_for_review: "emerald",
  request_more_information: "amber",
  flag_for_monitoring: "risk",
};

export function RecommendationBadge({
  recommendation,
  label,
}: {
  recommendation: RecommendationValue;
  label: string;
}) {
  return (
    <Badge tone={RECOMMENDATION_TONE[recommendation] ?? "neutral"}>
      <ShieldCheck size={11} />
      {label}
    </Badge>
  );
}

/** Reminder that the recommendation is not a credit decision. */
export function DecisionSupportNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[.06] p-3 text-[11px] leading-relaxed text-amber-200/90">
      <ShieldCheck size={14} className="mt-0.5 shrink-0 text-amber-400" />
      {children}
    </p>
  );
}
