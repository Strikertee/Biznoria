import { Component, useCallback, useEffect, useState, type ErrorInfo, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { can, type Role } from "./authz";
import { useSmes } from "./api/hooks";
import { Portfolio } from "./pages/Portfolio";
import { SmeDetail } from "./pages/SmeDetail";
import { ErrorState, Loading } from "./components/ui";

const client = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false } },
});

/** Without this, any render error unmounts the tree and leaves a blank white
 *  page — the worst possible failure mode during a live demo. */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Render error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-3xl p-6">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
            <p className="font-semibold">Something went wrong rendering this view</p>
            <p className="mt-1 font-mono text-xs">{this.state.error.message}</p>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-3 rounded-lg bg-wema-600 px-3 py-1.5 font-semibold text-white hover:bg-wema-700"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function SmeHome({ onSelect }: { onSelect: (id: string) => void }) {
  // SME role: review-only, own business only. Demo maps the signed-in
  // customer to the first SME; no cross-SME listing is rendered.
  const { data, isLoading, isError, error, refetch } = useSmes();
  const ownId = data && data.length > 0 ? data[0].id : null;
  useEffect(() => {
    if (ownId) onSelect(ownId);
  }, [ownId, onSelect]);
  if (isLoading) return <Loading label="Loading your business…" />;
  if (isError)
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Request failed"}
        onRetry={refetch}
      />
    );
  if (!ownId) return <p className="text-sm text-slate-500">No business linked to this login yet.</p>;
  return <Loading label="Opening your business…" />;
}

function Shell() {
  const [role, setRole] = useState<Role>("officer");
  const [route, setRoute] = useState<{ view: "portfolio" } | { view: "sme"; id: string }>({
    view: "portfolio",
  });

  // Functional updates that bail out when nothing changes: stable identities,
  // and idempotent so an effect can never drive a render loop.
  const openSme = useCallback((id: string) => {
    setRoute((prev) => (prev.view === "sme" && prev.id === id ? prev : { view: "sme", id }));
  }, []);

  const backToPortfolio = useCallback(() => {
    setRoute((prev) => (prev.view === "portfolio" ? prev : { view: "portfolio" }));
  }, []);

  const switchRole = useCallback((r: Role) => {
    setRole(r);
    setRoute((prev) => (prev.view === "portfolio" ? prev : { view: "portfolio" }));
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-wema-600 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-lg font-bold">Biznoria</p>
            <p className="text-xs text-wema-100">SME Financial Intelligence · synthetic-data prototype</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-wema-100">View as:</span>
            {(["officer", "sme"] as Role[]).map((r) => (
              <button
                key={r}
                onClick={() => switchRole(r)}
                className={`rounded-full px-3 py-1 font-bold ${
                  role === r ? "bg-white text-wema-700" : "bg-wema-700 text-wema-100 hover:bg-wema-800"
                }`}
              >
                {r === "officer" ? "Account officer" : "SME customer"}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        {role === "sme" ? (
          route.view === "sme" ? (
            <SmeDetail smeId={route.id} role={role} />
          ) : (
            <SmeHome onSelect={openSme} />
          )
        ) : route.view === "sme" ? (
          <SmeDetail smeId={route.id} role={role} onBack={backToPortfolio} />
        ) : (
          <Portfolio onSelect={openSme} />
        )}
        {!can(role, "simulate") && route.view !== "sme" && (
          <p className="text-xs text-slate-400">Signed in as SME customer — review-only surface.</p>
        )}
      </main>

      <footer className="border-t border-wema-100 px-4 py-4 text-center text-xs text-slate-400">
        Synthetic data only · Credit readiness and simulation are decision support, not underwriting · No live bank
        integration
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={client}>
      <ErrorBoundary>
        <Shell />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
