/** Frozen API client — paths must match docs/API_CONTRACT.md exactly. */
const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "http://localhost:8000";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json() as Promise<T>;
}

export const api = {
  portfolio: () => get("/api/v1/portfolio/summary"),
  smes: () => get("/api/v1/smes"),
  sme: (id: string) => get(`/api/v1/smes/${id}`),
  health: (id: string) => get(`/api/v1/smes/${id}/health`),
  cashflow: (id: string) => get(`/api/v1/smes/${id}/cashflow`),
  forecast: (id: string, horizon: 30 | 60 | 90 = 90) =>
    get(`/api/v1/smes/${id}/forecast?horizon=${horizon}`),
  credit: (id: string) => get(`/api/v1/smes/${id}/credit-readiness`),
  accounts: (id: string) => get(`/api/v1/smes/${id}/accounts`),
  simulate: (id: string, body: { amount: number; annual_rate: number; term_months: number }) =>
    post(`/api/v1/smes/${id}/loan-simulation`, body),
};
// TODO(FRONTEND): pages (portfolio, SME detail, health, cashflow/forecast charts,
// credit readiness, accounts/consent, simulator) with loading/error/empty states.
