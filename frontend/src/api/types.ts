/** Contract types — field names mirror docs/API_CONTRACT.md exactly. */
export interface SME {
  id: string;
  name: string;
  sector: string;
  size_band: string;
  region: string;
  joined_on: string;
}

export interface PortfolioSummary {
  sme_count: number;
  total_inflow_30d: number;
  total_outflow_30d: number;
  net_flow_30d: number;
  median_health_score: number;
  at_risk_count: number;
}

export interface HealthMetrics {
  sme_id: string;
  stability: number;
  growth: number;
  liquidity: number;
  expense_ratio: number;
  revenue_consistency: number;
  repayment_score: number;
  updated_at: string;
}

export interface CashflowPoint {
  date: string;
  inflow: number;
  outflow: number;
  net: number;
}

export interface CashflowSeries {
  sme_id: string;
  grain: "daily";
  points: CashflowPoint[];
}

export type Horizon = 30 | 60 | 90;

export interface ForecastPoint {
  date: string;
  yhat: number;
}

export interface Forecast {
  sme_id: string;
  horizon: Horizon;
  history_len: number;
  model_used: "baseline" | "hgb";
  mae_val: number | null;
  points: ForecastPoint[];
}

export interface CreditReadiness {
  sme_id: string;
  score: number;
  components: {
    stability: number;
    revenue_consistency: number;
    growth: number;
    repayment: number;
    liquidity: number;
  };
  reasons: string[];
  disclaimer: string;
  updated_at: string;
}

export interface Account {
  id: string;
  sme_id: string;
  provider: "wema" | "external_mock";
  label: string;
  consent_id: string | null;
  consent_expires_at: string | null;
  source: "internal" | "authorised_external";
}

export interface LoanSimRequest {
  amount: number;
  annual_rate: number;
  term_months: number;
}

export interface LoanSimResult {
  sme_id: string;
  monthly_repayment: number;
  projected_min_liquidity: number;
  projected_mean_liquidity: number;
  series: { date: string; projected_net: number }[];
  disclaimer: string;
}
