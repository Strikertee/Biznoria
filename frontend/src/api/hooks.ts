import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "./client";
import type {
  Account,
  CashflowSeries,
  CreditReadiness,
  Forecast,
  HealthMetrics,
  Horizon,
  LoanSimRequest,
  LoanSimResult,
  PortfolioSummary,
  SME,
} from "./types";

export const qk = {
  portfolio: ["portfolio"] as const,
  smes: ["smes"] as const,
  sme: (id: string) => ["sme", id] as const,
  health: (id: string) => ["health", id] as const,
  cashflow: (id: string) => ["cashflow", id] as const,
  forecast: (id: string, h: Horizon) => ["forecast", id, h] as const,
  credit: (id: string) => ["credit", id] as const,
  accounts: (id: string) => ["accounts", id] as const,
};

export const usePortfolio = () =>
  useQuery<PortfolioSummary>({ queryKey: qk.portfolio, queryFn: () => api.portfolio() as Promise<PortfolioSummary> });

export const useSmes = (enabled = true) =>
  useQuery<SME[]>({ queryKey: qk.smes, queryFn: () => api.smes() as Promise<SME[]>, enabled });

export const useSme = (id: string) =>
  useQuery<SME>({ queryKey: qk.sme(id), queryFn: () => api.sme(id) as Promise<SME> });

export const useHealth = (id: string) =>
  useQuery<HealthMetrics>({ queryKey: qk.health(id), queryFn: () => api.health(id) as Promise<HealthMetrics> });

export const useCashflow = (id: string) =>
  useQuery<CashflowSeries>({ queryKey: qk.cashflow(id), queryFn: () => api.cashflow(id) as Promise<CashflowSeries> });

export const useForecast = (id: string, horizon: Horizon) =>
  useQuery<Forecast>({
    queryKey: qk.forecast(id, horizon),
    queryFn: () => api.forecast(id, horizon) as Promise<Forecast>,
  });

export const useCredit = (id: string) =>
  useQuery<CreditReadiness>({ queryKey: qk.credit(id), queryFn: () => api.credit(id) as Promise<CreditReadiness> });

export const useAccounts = (id: string) =>
  useQuery<Account[]>({ queryKey: qk.accounts(id), queryFn: () => api.accounts(id) as Promise<Account[]> });

export const useSimulate = (id: string) =>
  useMutation<LoanSimResult, Error, LoanSimRequest>({
    mutationFn: (body) => api.simulate(id, body) as Promise<LoanSimResult>,
  });
