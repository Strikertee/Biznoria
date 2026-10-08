/** Contract types — frozen field names mirror docs/API_CONTRACT.md exactly.
 *  Fields below the frozen set are the additive P0 surfaces the backend also
 *  returns (see docs/DECISIONS.md CR-002). No frozen field is renamed. */

export type HealthStatus = "healthy" | "watch" | "risk";
export type ForecastStatus = "healthy" | "watch" | "high_pressure";
export type ConsentStatus = "active" | "expired" | "revoked" | "not_connected";
export type Trend = "growing" | "stable" | "declining" | "volatile";
export type Impact = "manageable" | "watch" | "high_pressure";

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
  healthy_count: number;
  watch_count: number;
  high_pressure_count: number;
}

export interface ExpenseCategory {
  category: string;
  amount: number;
  share: number;
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
  health_score: number;
  status: HealthStatus;
  trend: Trend;
  avg_monthly_inflow: number;
  avg_monthly_outflow: number;
  top_expense_categories: ExpenseCategory[];
  insights: string[];
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
  data_sources: string[];
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
  status: ForecastStatus;
  projected_mean_net: number;
  projected_min_net: number;
  drivers: string[];
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
  band: string;
  weights: Record<string, number>;
  positive_drivers: string[];
  negative_drivers: string[];
}

export interface Account {
  id: string;
  sme_id: string;
  provider: "wema" | "external_mock";
  label: string;
  consent_id: string | null;
  consent_expires_at: string | null;
  source: "internal" | "authorised_external";
  institution_name: string;
  account_type: string;
  masked_account: string;
  is_primary: boolean;
  consent_status: ConsentStatus;
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
  series: { date: string; projected_net: number; baseline_net: number }[];
  disclaimer: string;
  baseline_min_liquidity: number;
  baseline_mean_liquidity: number;
  impact: Impact;
  impact_label: string;
}

/* ---------------------------------------------------------------- applications */

export type ApplicationStatus = "submitted" | "under_review" | "recommendation_recorded";

/** Decision support only — there is deliberately no approve/decline value. */
export type RecommendationValue =
  | "recommend_for_review"
  | "request_more_information"
  | "flag_for_monitoring";

export interface LoanApplication {
  id: string;
  sme_id: string;
  sme_name: string;
  amount: number;
  annual_rate: number;
  term_months: number;
  purpose: string;
  monthly_repayment: number;
  status: ApplicationStatus;
  status_label: string;
  submitted_at: string;
  recommendation: RecommendationValue | null;
  recommendation_label: string | null;
  recommendation_note: string | null;
  recommendation_at: string | null;
  reviewed_by: string | null;
  disclaimer: string;
}

export interface LoanApplicationCreate {
  amount: number;
  annual_rate: number;
  term_months: number;
  purpose: string;
  consent: boolean;
}

export interface RecommendationRequest {
  recommendation: RecommendationValue;
  note: string;
}
