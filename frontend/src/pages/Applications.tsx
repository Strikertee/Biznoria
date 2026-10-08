import { useMemo, useState } from "react";
import { useApplications } from "../api/hooks";
import type { ApplicationStatus } from "../api/types";
import { ApplicationStatusBadge, RecommendationBadge } from "../components/ApplicationBadges";
import { Building, Coins, Hourglass, Search, Target, TrendUp } from "../components/icons";
import {
  Button,
  Card,
  Empty,
  ErrorState,
  Skeleton,
  Stat,
  fmtCompact,
  fmtNGN,
} from "../components/ui";

type Filter = "all" | "open" | "recorded";

const FILTERS: readonly { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "recorded", label: "Recommended" },
];

const OPEN_STATUSES: ApplicationStatus[] = ["submitted", "under_review"];

export function Applications({ onOpen }: { onOpen: (appId: string) => void }) {
  const { data, isLoading, isError, error, refetch } = useApplications();
  const [filter, setFilter] = useState<Filter>("open");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const list = data ?? [];
    const q = query.trim().toLowerCase();
    return list.filter((a) => {
      if (filter === "open" && !OPEN_STATUSES.includes(a.status)) return false;
      if (filter === "recorded" && a.status !== "recommendation_recorded") return false;
      if (!q) return true;
      return (
        a.sme_name.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q) ||
        a.purpose.toLowerCase().includes(q)
      );
    });
  }, [data, filter, query]);

  const all = data ?? [];
  const openCount = all.filter((a) => OPEN_STATUSES.includes(a.status)).length;
  const requested = all.reduce((sum, a) => sum + a.amount, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Requests in the queue" value={`${all.length}`} />
        <Stat
          label="Awaiting a recommendation"
          value={`${openCount}`}
          tone={openCount > 0 ? "amber" : "emerald"}
        />
        <Stat label="Total value requested" value={fmtCompact(requested)} tone="emerald" />
      </div>

      <Card
        title="Facility requests"
        subtitle="Open a request to review the business and record a recommendation"
        padded={false}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-[220px]">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search business or reference…"
                aria-label="Search applications"
                className="focus-ring w-full rounded-xl border border-ink-800 bg-ink-950/60 py-2 pl-9 pr-3 text-sm text-ink-100 placeholder:text-ink-600 transition-colors duration-300 hover:border-ink-700"
              />
            </div>
            <div className="flex gap-1 rounded-xl border border-ink-800 bg-ink-950/60 p-1">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  aria-pressed={filter === f.value}
                  className={`focus-ring rounded-lg px-2.5 py-1 text-xs font-bold transition-all duration-300 ease-premium ${
                    filter === f.value
                      ? "bg-emerald-500 text-ink-950 shadow-glow-emerald"
                      : "text-ink-400 hover:text-ink-100"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        }
      >
        <div className="px-5 pb-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : isError ? (
            <ErrorState
              message={error instanceof Error ? error.message : "Request failed"}
              onRetry={refetch}
            />
          ) : rows.length === 0 ? (
            <Empty
              message={
                query
                  ? `No requests match “${query}”.`
                  : filter === "recorded"
                    ? "No recommendations recorded yet."
                    : "Nothing waiting — the queue is clear."
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-ink-800">
              <table className="w-full min-w-[880px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-ink-950/70 text-[10px] uppercase tracking-[0.14em] text-ink-500">
                    <th scope="col" className="px-5 py-3 font-semibold">Business</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Requested</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Est. monthly</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Recommendation</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a, i) => (
                    <tr
                      key={a.id}
                      onClick={() => onOpen(a.id)}
                      className={`group cursor-pointer border-t border-ink-800/70 transition-colors duration-200 hover:bg-emerald-500/[.05] ${
                        i % 2 === 1 ? "bg-white/[.015]" : ""
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-ink-400 ring-1 ring-inset ring-white/10 transition-colors duration-200 group-hover:text-emerald-300 group-hover:ring-emerald-500/30">
                            <Building size={15} />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-ink-100">{a.sme_name}</p>
                            <p className="truncate font-mono text-[11px] text-ink-600">
                              {a.id} · {a.purpose || "no purpose given"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="tnum font-semibold text-white">{fmtNGN(a.amount)}</p>
                        <p className="text-[11px] text-ink-600">
                          {a.term_months} months · {(a.annual_rate * 100).toFixed(1)}% p.a.
                        </p>
                      </td>
                      <td className="tnum px-4 py-3.5 text-ink-300">
                        {fmtNGN(a.monthly_repayment)}
                      </td>
                      <td className="px-4 py-3.5">
                        <ApplicationStatusBadge status={a.status} label={a.status_label} />
                      </td>
                      <td className="px-4 py-3.5">
                        {a.recommendation && a.recommendation_label ? (
                          <RecommendationBadge
                            recommendation={a.recommendation}
                            label={a.recommendation_label}
                          />
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-600">
                            <Hourglass size={12} />
                            Awaiting review
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onOpen(a.id)}
                          className="opacity-90 group-hover:opacity-100"
                        >
                          <Target size={13} />
                          Review
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && !isError && rows.length > 0 && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-600">
              <Coins size={13} />
              Showing <span className="tnum font-semibold text-ink-400">{rows.length}</span> of{" "}
              <span className="tnum font-semibold text-ink-400">{all.length}</span> requests
              <span className="ml-auto hidden items-center gap-1.5 sm:inline-flex">
                <TrendUp size={13} />
                Recommendations are decision support — never an approval or decline
              </span>
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
