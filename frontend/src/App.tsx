import { Component, useCallback, useState, type ErrorInfo, type ReactNode } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import type { Role } from "./authz";
import { setSession as setClientSession, type Session } from "./api/client";
import { useSme, useSmes } from "./api/hooks";
import { Portfolio } from "./pages/Portfolio";
import { SmeDetail } from "./pages/SmeDetail";
import { Applications } from "./pages/Applications";
import { ApplicationReview } from "./pages/ApplicationReview";
import { LoanApplicationPanel } from "./components/LoanApplicationPanel";
import { Sidebar } from "./components/Sidebar";
import { SignIn } from "./components/SignIn";
import { TopBar } from "./components/TopBar";
import { AlertTriangle } from "./components/icons";
import { Button, Empty } from "./components/ui";

type Route =
  | { view: "portfolio" }
  | { view: "sme"; id: string }
  | { view: "applications" }
  | { view: "application"; id: string };

const client = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false } },
});

/** Without this, any render error unmounts the tree and leaves a blank page —
 *  the worst possible failure mode during a live demo. */
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
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="surface max-w-lg border-red-500/30 p-6" role="alert">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400 ring-1 ring-inset ring-red-500/25">
                <AlertTriangle size={18} />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-red-200">Something went wrong rendering this view</p>
                <p className="mt-1 break-words font-mono text-xs text-ink-400">
                  {this.state.error.message}
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => this.setState({ error: null })}
                  className="mt-4"
                >
                  Try again
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function Shell() {
  const [session, setSessionState] = useState<Session | null>(null);
  const [route, setRoute] = useState<Route>({ view: "portfolio" });
  const queryClient = useQueryClient();

  const isSme = session?.role === "sme";
  // The officer surface lists every business; an SME session must never call it.
  const { data: smes } = useSmes(session?.role === "officer");

  // An SME session is always scoped to its own business — never a client-supplied id.
  const activeSmeId =
    isSme ? session!.smeId : route.view === "sme" ? route.id : null;
  // Shares the cache entry with SmeDetail, so this costs no extra request.
  const { data: activeSme } = useSme(activeSmeId ?? "", activeSmeId !== null);

  const signIn = useCallback(
    (next: Session) => {
      setClientSession(next);
      // Drop the previous persona's cached data so nothing leaks across roles.
      queryClient.clear();
      setSessionState(next);
      setRoute({ view: "portfolio" });
    },
    [queryClient],
  );

  const signOut = useCallback(() => {
    setClientSession(null);
    queryClient.clear();
    setSessionState(null);
    setRoute({ view: "portfolio" });
  }, [queryClient]);

  // Functional updates that bail out when nothing changes: stable identities,
  // and idempotent so an effect can never drive a render loop.
  const openSme = useCallback((id: string) => {
    setRoute((prev) => (prev.view === "sme" && prev.id === id ? prev : { view: "sme", id }));
  }, []);

  const openApplications = useCallback(() => {
    setRoute((prev) => (prev.view === "applications" ? prev : { view: "applications" }));
  }, []);

  const openApplication = useCallback((id: string) => {
    setRoute((prev) =>
      prev.view === "application" && prev.id === id ? prev : { view: "application", id },
    );
  }, []);

  const backToPortfolio = useCallback(() => {
    setRoute((prev) => (prev.view === "portfolio" ? prev : { view: "portfolio" }));
  }, []);

  const switchRole = useCallback(
    (role: Role) => {
      if (role === "officer") {
        signIn({ role: "officer", smeId: null });
        return;
      }
      // Quick switch to the SME surface. The persona chip shows exactly which
      // business is now in view, so this is never a silent identity change.
      const fallback = smes?.[0]?.id ?? null;
      if (fallback) signIn({ role: "sme", smeId: fallback });
      else signOut(); // no directory loaded yet — fall back to the sign-in screen
    },
    [smes, signIn, signOut],
  );

  if (!session) return <SignIn onSignIn={signIn} />;

  const title =
    route.view === "applications"
      ? "Facility requests"
      : route.view === "application"
        ? "Facility request"
        : activeSmeId
          ? (activeSme?.name ?? "Business detail")
          : "Portfolio overview";

  const subtitle =
    route.view === "applications"
      ? "Officer review queue · recommendation is decision support only"
      : route.view === "application"
        ? "Review the request, then record a recommendation"
        : activeSmeId
          ? "Financial health · cash flow · forecast · credit readiness"
          : "Synthetic SME portfolio · decision support only";

  return (
    <div className="min-h-screen bg-ink-950">
      {/* Engineering graph-paper, faded at the top edge. Decorative only. */}
      <div className="grid-texture pointer-events-none fixed inset-x-0 top-0 -z-10 h-[520px]" />

      <Sidebar
        role={session.role}
        activeSmeId={activeSmeId}
        applicationsActive={route.view === "applications" || route.view === "application"}
        onOverview={backToPortfolio}
        onSelectSme={openSme}
        onApplications={openApplications}
        onSignOut={signOut}
      />

      <div className="flex min-h-screen flex-col pl-16 lg:pl-60">
        <TopBar
          role={session.role}
          onRoleChange={switchRole}
          persona={isSme ? (activeSme?.name ?? "SME customer") : "Account officer"}
          onSignOut={signOut}
          title={title}
          subtitle={subtitle}
          onBack={
            !isSme && (route.view === "sme" || route.view === "application")
              ? route.view === "application"
                ? openApplications
                : backToPortfolio
              : undefined
          }
        />

        <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div
            key={`${session.role}-${route.view}-${activeSmeId ?? ""}`}
            className="animate-fade-up space-y-6"
          >
            {isSme ? (
              session.smeId ? (
                <>
                  <LoanApplicationPanel smeId={session.smeId} />
                  <SmeDetail smeId={session.smeId} role="sme" />
                </>
              ) : (
                <Empty message="No business linked to this login." />
              )
            ) : route.view === "applications" ? (
              <Applications onOpen={openApplication} />
            ) : route.view === "application" ? (
              <ApplicationReview appId={route.id} onBack={openApplications} />
            ) : route.view === "sme" ? (
              <SmeDetail smeId={route.id} role="officer" onBack={backToPortfolio} />
            ) : (
              <Portfolio onSelect={openSme} />
            )}
          </div>
        </main>

        <footer className="border-t border-ink-800 px-4 py-5 text-center text-[11px] leading-relaxed text-ink-600 sm:px-6 lg:px-8">
          Synthetic data only · Credit readiness and simulation are decision support, not
          underwriting · No live bank integration
        </footer>
      </div>
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
