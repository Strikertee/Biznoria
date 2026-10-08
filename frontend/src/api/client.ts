/** Frozen API client — paths must match docs/API_CONTRACT.md exactly. */
import type { Horizon, LoanSimRequest } from "./types";

export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, path: string) {
    super(`${status} ${path}`);
    this.status = status;
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new ApiError(res.status, path);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(res.status, path);
  return res.json() as Promise<T>;
}

export const api = {
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
};
