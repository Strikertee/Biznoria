import type { ReactNode } from "react";
import type { Role } from "../authz";
import { useApplications, useSmes } from "../api/hooks";
import { Building, Coins, LayoutGrid, LogOut, Rows, ShieldCheck } from "./icons";

function BrandMark() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-glow-emerald">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
  );
}

function NavItem({
  label,
  icon,
  active,
  onClick,
  muted = false,
  badge,
}: {
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
  muted?: boolean;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-current={active ? "page" : undefined}
      className={`focus-ring group relative flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-sm transition-all duration-300 ease-premium lg:px-3 ${
        active
          ? "bg-emerald-500/10 font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-500/25"
          : muted
            ? "text-ink-500 hover:bg-white/[.04] hover:text-ink-200"
            : "text-ink-400 hover:bg-white/[.04] hover:text-ink-100"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute left-0 h-5 w-[3px] rounded-r-full bg-emerald-400 transition-opacity duration-300 ${
          active ? "opacity-100" : "opacity-0"
        }`}
      />
      <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
        {icon}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[9px] font-bold text-ink-950 lg:hidden">
            {badge}
          </span>
        )}
      </span>
      <span className="hidden flex-1 truncate text-left lg:inline">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="hidden h-5 min-w-5 items-center justify-center rounded-full bg-amber-400/15 px-1.5 text-[10px] font-bold text-amber-300 ring-1 ring-inset ring-amber-400/30 lg:inline-flex">
          {badge}
        </span>
      )}
    </button>
  );
}

export function Sidebar({
  role,
  activeSmeId,
  applicationsActive,
  onOverview,
  onSelectSme,
  onApplications,
  onSignOut,
}: {
  role: Role;
  activeSmeId: string | null;
  applicationsActive: boolean;
  onOverview: () => void;
  onSelectSme: (id: string) => void;
  onApplications: () => void;
  onSignOut: () => void;
}) {
  // Both are officer-only endpoints; an SME session must never call them.
  const isOfficer = role === "officer";
  const { data: smes } = useSmes(isOfficer);
  const { data: applications } = useApplications(isOfficer);
  const smeList = isOfficer ? (smes ?? []) : [];
  const overviewActive = isOfficer && activeSmeId === null && !applicationsActive;
  const openCount = (applications ?? []).filter((a) => a.status !== "recommendation_recorded")
    .length;

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-16 flex-col border-r border-ink-800 bg-ink-950/95 backdrop-blur-xl lg:w-60">
      <div className="flex h-16 items-center gap-2.5 px-3 lg:px-5">
        <BrandMark />
        <div className="hidden min-w-0 lg:block">
          <p className="truncate text-sm font-bold tracking-tight text-white">Biznoria</p>
          <p className="truncate text-[10px] text-ink-500">SME Intelligence</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-4 lg:px-3">
        {isOfficer ? (
          <>
            <NavItem
              label="Overview"
              icon={<LayoutGrid size={17} />}
              active={overviewActive}
              onClick={onOverview}
            />
            <NavItem
              label="Facility requests"
              icon={<Coins size={17} />}
              active={applicationsActive}
              onClick={onApplications}
              badge={openCount}
            />
          </>
        ) : (
          <NavItem
            label="My business"
            icon={<Building size={17} />}
            active={activeSmeId !== null}
            onClick={() => activeSmeId && onSelectSme(activeSmeId)}
          />
        )}

        <div className="hidden px-3 pb-1 pt-4 lg:block">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-600">
            {isOfficer ? "Portfolio" : "Review surface"}
          </p>
        </div>

        {isOfficer &&
          smeList.map((s) => (
            <NavItem
              key={s.id}
              label={s.name}
              icon={<Rows size={16} />}
              active={activeSmeId === s.id && !applicationsActive}
              muted
              onClick={() => onSelectSme(s.id)}
            />
          ))}

        {isOfficer && smeList.length === 0 && (
          <p className="hidden px-3 py-2 text-[11px] text-ink-600 lg:block">Loading portfolio…</p>
        )}
      </nav>

      <div className="border-t border-ink-800 p-3 lg:p-4">
        <div className="flex items-center gap-2.5 rounded-xl bg-white/[.03] p-2.5 ring-1 ring-inset ring-white/5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/25">
            <ShieldCheck size={14} />
          </span>
          <div className="hidden min-w-0 flex-1 lg:block">
            <p className="truncate text-[11px] font-semibold text-ink-200">
              {isOfficer ? "Account officer" : "SME customer"}
            </p>
            <p className="truncate text-[10px] text-ink-500">Synthetic data only</p>
          </div>
          <button
            onClick={onSignOut}
            className="focus-ring hidden h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-500 transition-colors duration-300 hover:bg-white/[.06] hover:text-ink-100 lg:flex"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}
