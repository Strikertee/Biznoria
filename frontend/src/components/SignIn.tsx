import { useMemo, useState, type ReactNode } from "react";
import type { Role } from "../authz";
import type { Session } from "../api/client";
import { useSmes } from "../api/hooks";
import { Bank, Building, Check, Search, ShieldCheck, SlidersHorizontal } from "./icons";
import { Badge, Button, Empty, Loading, SectorPill, SizePill } from "./ui";

const PERSONAS: readonly {
  role: Role;
  title: string;
  blurb: string;
  detail: string;
}[] = [
  {
    role: "officer",
    title: "Account officer",
    blurb: "Portfolio, drill-down, loan simulator",
    detail: "Sees every business in the portfolio and the officer-only tooling.",
  },
  {
    role: "sme",
    title: "SME customer",
    blurb: "Your business only — review-only",
    detail: "Sees its own cash flow, health, forecast and credit readiness. No simulator.",
  },
];

function PersonaCard({
  selected,
  onSelect,
  icon,
  title,
  blurb,
  detail,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: ReactNode;
  title: string;
  blurb: string;
  detail: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`focus-ring surface surface-hover w-full p-4 text-left ${
        selected ? "border-emerald-500/50 ring-1 ring-emerald-500/25" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${
            selected
              ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
              : "bg-white/[.04] text-ink-400 ring-white/10"
          }`}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-white">{title}</p>
            {selected && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-ink-950">
                <Check size={12} />
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-ink-400">{blurb}</p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-ink-600">{detail}</p>
        </div>
      </div>
    </button>
  );
}

export function SignIn({ onSignIn }: { onSignIn: (s: Session) => void }) {
  const [role, setRole] = useState<Role>("officer");
  const [smeId, setSmeId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // No session is set yet, so this request carries no role headers and the
  // backend answers as its default principal — enough to populate the directory.
  const { data: smes, isLoading, isError } = useSmes();

  const rows = useMemo(() => {
    const list = smes ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.sector.toLowerCase().includes(q) ||
        s.region.toLowerCase().includes(q),
    );
  }, [smes, query]);

  const canContinue = role === "officer" || smeId !== null;
  const chosen = smes?.find((s) => s.id === smeId) ?? null;

  return (
    <div className="relative min-h-screen bg-ink-950">
      <div className="grid-texture pointer-events-none absolute inset-x-0 top-0 h-[420px]" />

      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-5 py-10">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 19V7.5L12 3l8 4.5V19"
                stroke="#04140d"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M9 19v-5h6v5"
                stroke="#04140d"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div>
            <p className="text-base font-bold tracking-tight text-white">Biznoria</p>
            <p className="text-xs text-ink-500">SME Financial Intelligence · synthetic-data prototype</p>
          </div>
        </div>

        <h1 className="text-xl font-bold tracking-tight text-white">Sign in to continue</h1>
        <p className="mt-1 text-sm text-ink-400">
          Choose the surface you want to view. The API authorises each surface per role — the
          frontend only renders what the session is allowed to reach.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PERSONAS.map((p) => (
            <PersonaCard
              key={p.role}
              selected={role === p.role}
              onSelect={() => setRole(p.role)}
              icon={p.role === "officer" ? <SlidersHorizontal size={17} /> : <Building size={17} />}
              title={p.title}
              blurb={p.blurb}
              detail={p.detail}
            />
          ))}
        </div>

        {role === "sme" && (
          <div className="surface mt-4 animate-fade-up p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="label-micro text-ink-500">Select your business</p>
                <p className="mt-1 text-xs text-ink-500">
                  In production this comes from the customer&apos;s ALAT for Business login.
                </p>
              </div>
              {chosen && <Badge tone="emerald">{chosen.name}</Badge>}
            </div>

            <div className="relative mt-3">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, sector, region…"
                aria-label="Search businesses"
                className="focus-ring w-full rounded-xl border border-ink-800 bg-ink-950/60 py-2 pl-9 pr-3 text-sm text-ink-100 placeholder:text-ink-600 transition-colors duration-300 hover:border-ink-700"
              />
            </div>

            <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-ink-800">
              {isLoading ? (
                <div className="p-3">
                  <Loading label="Loading businesses…" />
                </div>
              ) : isError ? (
                <div className="p-4 text-xs text-red-300">
                  Could not load the business directory.
                </div>
              ) : rows.length === 0 ? (
                <div className="p-3">
                  <Empty message={`No businesses match “${query}”.`} />
                </div>
              ) : (
                <ul className="divide-y divide-ink-800">
                  {rows.map((s) => {
                    const active = s.id === smeId;
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => setSmeId(s.id)}
                          aria-pressed={active}
                          className={`focus-ring flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-200 ${
                            active ? "bg-emerald-500/[.07]" : "hover:bg-white/[.03]"
                          }`}
                        >
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${
                              active
                                ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                                : "bg-white/[.04] text-ink-500 ring-white/10"
                            }`}
                          >
                            <Bank size={14} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-ink-100">
                              {s.name}
                            </span>
                            <span className="block truncate font-mono text-[10px] text-ink-600">
                              {s.id}
                            </span>
                          </span>
                          <SectorPill sector={s.sector} />
                          <SizePill band={s.size_band} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="inline-flex items-center gap-2 text-[11px] text-ink-600">
            <ShieldCheck size={13} />
            Synthetic data only · no live bank integration
          </p>
          <Button
            variant="primary"
            disabled={!canContinue}
            onClick={() => onSignIn({ role, smeId: role === "sme" ? smeId : null })}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
