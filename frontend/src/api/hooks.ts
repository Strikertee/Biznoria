import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type {
  Account,
  CashflowSeries,
  CreditReadiness,
  Forecast,
  HealthMetrics,
  Horizon,
  LoanApplication,
  LoanApplicationCreate,
  LoanSimRequest,
  LoanSimResult,
  PortfolioSummary,
  RecommendationRequest,
  SME,
} from "./types";

export const qk = {
  readyz: ["readyz"] as const,
  portfolio: ["portfolio"] as const,
  smes: ["smes"] as const,
  sme: (id: string) => ["sme", id] as const,
  health: (id: string) => ["health", id] as const,
  cashflow: (id: string) => ["cashflow", id] as const,
  forecast: (id: string, h: Horizon) => ["forecast", id, h] as const,
  credit: (id: string) => ["credit", id] as const,
  accounts: (id: string) => ["accounts", id] as const,
  applications: ["applications"] as const,
  applicationsForSme: (id: string) => ["applications", "sme", id] as const,
  application: (appId: string) => ["application", appId] as const,
};

export const useReadyz = () =>
  useQuery<{ ready: boolean; checks: Record<string, boolean> }>({
    queryKey: qk.readyz,
    queryFn: () => api.readyz(),
    refetchInterval: 30_000,
  });

export const usePortfolio = () =>
  useQuery<PortfolioSummary>({ queryKey: qk.portfolio, queryFn: () => api.portfolio() as Promise<PortfolioSummary> });

export const useSmes = (enabled = true) =>
  useQuery<SME[]>({ queryKey: qk.smes, queryFn: () => api.smes() as Promise<SME[]>, enabled });

export const useSme = (id: string, enabled = true) =>
  useQuery<SME>({ queryKey: qk.sme(id), queryFn: () => api.sme(id) as Promise<SME>, enabled });

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

/* ---------------------------------------------------------------- applications */

export const useApplications = (enabled = true) =>
  useQuery<LoanApplication[]>({
    queryKey: qk.applications,
    queryFn: () => api.applications() as Promise<LoanApplication[]>,
    enabled,
  });

export const useSmeApplications = (id: string, enabled = true) =>
  useQuery<LoanApplication[]>({
    queryKey: qk.applicationsForSme(id),
    queryFn: () => api.applicationsForSme(id) as Promise<LoanApplication[]>,
    enabled,
  });

export const useApplication = (appId: string, enabled = true) =>
  useQuery<LoanApplication>({
    queryKey: qk.application(appId),
    queryFn: () => api.application(appId) as Promise<LoanApplication>,
    enabled,
  });

export const useSubmitApplication = (smeId: string) => {
  const queryClient = useQueryClient();
  return useMutation<LoanApplication, Error, LoanApplicationCreate>({
    mutationFn: (body) => api.submitApplication(smeId, body) as Promise<LoanApplication>,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.applicationsForSme(smeId) });
      void queryClient.invalidateQueries({ queryKey: qk.applications });
    },
  });
};

export const useRecommend = (appId: string) => {
  const queryClient = useQueryClient();
  return useMutation<LoanApplication, Error, RecommendationRequest>({
    mutationFn: (body) => api.recommend(appId, body) as Promise<LoanApplication>,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.applications });
      void queryClient.invalidateQueries({ queryKey: qk.application(appId) });
    },
  });
};
