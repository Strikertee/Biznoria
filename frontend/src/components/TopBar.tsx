import type { Role } from "../authz";
import { useReadyz } from "../api/hooks";
import { ChevronLeft, LogOut } from "./icons";
import { SegmentedToggle } from "./ui";

const ROLE_OPTIONS: readonly { value: Role; label: string }[] = [
  { value: "officer", label: "Account officer" },
  { value: "sme", label: "SME customer" },
];

function ReadyPill() {
  const { data, isError, isLoading } = useReadyz();
  const state = isError ? "down" : isLoading ? "pending" : data?.ready ? "ready" : "pending";
  const map = {
    ready: { dot: "bg-emerald-400", text: "text-emerald-300", label: "System ready" },
    pending: { dot: "bg-amber-400", text: "text-amber-300", label: "Starting…" },
    down: { dot: "bg-red-400", text: "text-red-300", label: "API unreachable" },
  }[state];

  return (
    <span
      className="hidden items-center gap-2 rounded-full border border-ink-800 bg-ink-900/60 px-3 py-1.5 text-[11px] font-medium backdrop-blur lg:inline-flex"
      title="Backend readiness (/readyz)"
    >
      <span className="relative flex h-1.5 w-1.5">
        <span
          className={`absolute inline-flex h-full w-full rounded-full ${map.dot} opacity-70 ${
            state === "ready" ? "animate-ping" : ""
          }`}
        />
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${map.dot}`} />
      </span>
      <span className={map.text}>{map.label}</span>
    </span>
  );
}

export function TopBar({
  role,
  onRoleChange,
  persona,
  onSignOut,
  title,
  subtitle,
  onBack,
}: {
  role: Role;
  onRoleChange: (r: Role) => void;
  persona: string;
  onSignOut: () => void;
  title: string;
  subtitle: string;
  onBack?: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-ink-800/80 bg-ink-950/70 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="focus-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink-800 text-ink-400 transition-colors duration-300 hover:border-ink-700 hover:text-white"
              aria-label="Back to portfolio"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold tracking-tight text-white sm:text-base">
              {title}
            </h1>
            <p className="truncate text-[11px] text-ink-500">{subtitle}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <ReadyPill />
          <SegmentedToggle
            value={role}
            options={ROLE_OPTIONS}
            onChange={onRoleChange}
            label="View as"
          />
          <div className="hidden items-center gap-2 rounded-full border border-ink-800 bg-ink-900/60 py-1 pl-3 pr-1 backdrop-blur md:flex">
            <span className="max-w-[160px] truncate text-[11px] font-medium text-ink-300">
              {persona}
            </span>
            <button
              onClick={onSignOut}
              className="focus-ring flex h-6 w-6 items-center justify-center rounded-full text-ink-500 transition-colors duration-300 hover:bg-white/[.06] hover:text-ink-100"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
