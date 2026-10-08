import type { ReactNode } from "react";

export const fmtNGN = (v: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(v);

export function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-wema-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-wema-800">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Stat({ label, value, tone = "text-slate-800" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-wema-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-wema-700">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="animate-pulse rounded-xl bg-wema-50 p-6 text-sm text-wema-700" role="status">
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
      <p className="font-semibold">Something went wrong</p>
      <p className="mt-1">{message}</p>
      <button
        onClick={onRetry}
        className="mt-3 rounded-lg bg-wema-600 px-3 py-1.5 font-semibold text-white hover:bg-wema-700"
      >
        Retry
      </button>
    </div>
  );
}

export function Empty({ message }: { message: string }) {
  return <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">{message}</div>;
}

export function ScoreBar({ value }: { value: number }) {
  const tone = value >= 75 ? "bg-emerald-500" : value >= 55 ? "bg-wema-500" : value >= 35 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function QueryState({
  isLoading,
  isError,
  error,
  refetch,
  isEmpty,
  loadingLabel,
  emptyMessage,
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
  isEmpty: boolean;
  loadingLabel: string;
  emptyMessage: string;
  /**
   * A render function, NOT plain JSX. JSX children are evaluated eagerly by the
   * caller, so `<QueryState>{data!.x}</QueryState>` dereferences `data` before
   * this component can check `isLoading` — which throws on the first render and
   * blanks the page. Passing a function defers evaluation until data is ready.
   */
  children: () => ReactNode;
}) {
  if (isLoading) return <Loading label={loadingLabel} />;
  if (isError) return <ErrorState message={error instanceof Error ? error.message : "Request failed"} onRetry={refetch} />;
  if (isEmpty) return <Empty message={emptyMessage} />;
  return <>{children()}</>;
}
