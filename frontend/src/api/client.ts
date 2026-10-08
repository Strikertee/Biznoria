/** Frozen API client — paths must match docs/API_CONTRACT.md exactly. */
import type { Role } from "../authz";
import type {
  Horizon,
  LoanApplication,
  LoanApplicationCreate,
  LoanSimRequest,
  RecommendationRequest,
} from "./types";

export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ?? "http://localhost:8000";

/** The signed-in persona. Sent on every request so the backend can enforce the
 *  role matrix (see backend/app/auth.py) rather than trusting the UI. */
export interface Session {
  role: Role;
  /** The SME's own business id. Null for the officer role. */
  smeId: string | null;
}

let session: Session | null = null;

export function setSession(next: Session | null): void {
  session = next;
}

export function getSession(): Session | null {
  return session;
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...(extra ?? {}) };
  if (session) {
    headers["X-Role"] = session.role;
    if (session.smeId) headers["X-SME-Id"] = session.smeId;
  }
  return headers;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, path: string) {
    super(`${status} ${path}`);
    this.status = status;
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders() });
  if (!res.ok) throw new ApiError(res.status, path);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(res.status, path);
  return res.json() as Promise<T>;
}

export const api = {
  readyz: () => get<{ ready: boolean; checks: Record<string, boolean> }>("/readyz"),
  portfolio: () => get("/api/v1/portfolio/summary"),
  smes: () => get("/api/v1/smes"),
  sme: (id: string) => get(`/api/v1/smes/${id}`),
  health: (id: string) => get(`/api/v1/smes/${id}/health`),
  cashflow: (id: string) => get(`/api/v1/smes/${id}/cashflow`),
  forecast: (id: string, horizon: Horizon = 90) =>
    get(`/api/v1/smes/${id}/forecast?horizon=${horizon}`),
  credit: (id: string) => get(`/api/v1/smes/${id}/credit-readiness`),
  accounts: (id: string) => get(`/api/v1/smes/${id}/accounts`),
  simulate: (id: string, body: LoanSimRequest) =>
    post(`/api/v1/smes/${id}/loan-simulation`, body),
  applications: () => get<LoanApplication[]>("/api/v1/loan-applications"),
  application: (appId: string) => get<LoanApplication>(`/api/v1/loan-applications/${appId}`),
  applicationsForSme: (id: string) =>
    get<LoanApplication[]>(`/api/v1/smes/${id}/loan-applications`),
  submitApplication: (id: string, body: LoanApplicationCreate) =>
    post<LoanApplication>(`/api/v1/smes/${id}/loan-applications`, body),
  recommend: (appId: string, body: RecommendationRequest) =>
    post<LoanApplication>(`/api/v1/loan-applications/${appId}/recommendation`, body),
};
