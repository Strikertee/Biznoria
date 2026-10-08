import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { can, type Role } from "./authz";
import { useSmes } from "./api/hooks";
import { Portfolio } from "./pages/Portfolio";
import { SmeDetail } from "./pages/SmeDetail";
import { Loading } from "./components/ui";

const client = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false } },
});

function SmeHome({ onSelect }: { onSelect: (id: string) => void }) {
  // SME role: review-only, own business only. Demo maps the signed-in
  // customer to the first SME; no cross-SME listing is rendered.
  const { data, isLoading } = useSmes();
  const ownId = data && data.length > 0 ? data[0].id : null;
  useEffect(() => {
    if (ownId) onSelect(ownId);
  }, [ownId, onSelect]);
  if (isLoading) return <Loading label="Loading your business…" />;
  if (!ownId) return <p className="text-sm text-slate-500">No business linked to this login yet.</p>;
  return <Loading label="Opening your business…" />;
}

function Shell() {
  const [role, setRole] = useState<Role>("officer");
  const [route, setRoute] = useState<{ view: "portfolio" } | { view: "sme"; id: string }>({
    view: "portfolio",
  });

  const switchRole = (r: Role) => {
    setRole(r);
    setRoute({ view: "portfolio" });
  };

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
            <SmeHome onSelect={(id) => setRoute({ view: "sme", id })} />
          )
        ) : route.view === "sme" ? (
          <SmeDetail smeId={route.id} role={role} onBack={() => setRoute({ view: "portfolio" })} />
        ) : (
          <Portfolio onSelect={(id) => setRoute({ view: "sme", id })} />
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
      <Shell />
    </QueryClientProvider>
  );
}
