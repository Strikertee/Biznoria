"""Pydantic v2 schemas.

Field names marked *frozen* come verbatim from ``docs/API_CONTRACT.md`` and must
never be renamed or removed. Fields marked *additive* are required to render the
P0 surfaces described in the PRD (§5.1–§5.6) that the minimal contract schema
does not carry; they are strictly additive and never replace a frozen field.
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_serializer

# --------------------------------------------------------------------------- #
# SME
# --------------------------------------------------------------------------- #


class SME(BaseModel):
    """frozen: {id, name, sector, size_band, region, joined_on}"""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    sector: str
    size_band: str
    region: str
    joined_on: date


class PortfolioSummary(BaseModel):
    """frozen 6 fields + additive status counts (PRD §5.1)."""

    sme_count: int
    total_inflow_30d: float
    total_outflow_30d: float
    net_flow_30d: float
    median_health_score: float
    at_risk_count: int
    # additive (PRD §5.1: Healthy / Watch / High Pressure counts)
    healthy_count: int = 0
    watch_count: int = 0
    high_pressure_count: int = 0


class ExpenseCategory(BaseModel):
    """additive (PRD §5.2 top expense categories)."""

    category: str
    amount: float
    share: float


class HealthMetrics(BaseModel):
    """frozen 8 fields + additive PRD §5.2 surfaces."""

    sme_id: str
    stability: float
    growth: float
    liquidity: float
    expense_ratio: float
    revenue_consistency: float
    repayment_score: float
    updated_at: datetime
    # additive
    health_score: float = 0.0
    status: str = "watch"
    trend: str = "stable"
    avg_monthly_inflow: float = 0.0
    avg_monthly_outflow: float = 0.0
    top_expense_categories: list[ExpenseCategory] = Field(default_factory=list)
    insights: list[str] = Field(default_factory=list)

    @field_serializer("updated_at")
    def _ser_dt(self, v: datetime) -> str:
        return _iso_z(v)


class CashflowPoint(BaseModel):
    date: date
    inflow: float
    outflow: float
    net: float


class CashflowSeries(BaseModel):
    sme_id: str
    grain: str = "daily"
    points: list[CashflowPoint] = Field(default_factory=list)
    # additive (PRD §5.3 Wema-only vs unified authorised data)
    data_sources: list[str] = Field(default_factory=lambda: ["wema"])


class ForecastPoint(BaseModel):
    date: date
    yhat: float


class Forecast(BaseModel):
    sme_id: str
    horizon: int
    history_len: int
    model_used: str
    mae_val: float | None = None
    points: list[ForecastPoint] = Field(default_factory=list)
    # additive (PRD §5.4 status + key drivers)
    status: str = "watch"
    projected_mean_net: float = 0.0
    projected_min_net: float = 0.0
    drivers: list[str] = Field(default_factory=list)


class CreditComponents(BaseModel):
    stability: float
    revenue_consistency: float
    growth: float
    repayment: float
    liquidity: float


class CreditReadiness(BaseModel):
    sme_id: str
    score: float
    components: CreditComponents
    reasons: list[str] = Field(default_factory=list)
    disclaimer: str
    updated_at: datetime
    # additive (PRD §5.5 weights + positive/negative drivers)
    band: str = "emerging"
    weights: dict[str, float] = Field(default_factory=dict)
    positive_drivers: list[str] = Field(default_factory=list)
    negative_drivers: list[str] = Field(default_factory=list)

    @field_serializer("updated_at")
    def _ser_dt(self, v: datetime) -> str:
        return _iso_z(v)


class Account(BaseModel):
    """frozen 7 fields + additive PRD §5.3 / §8.1 display fields."""

    id: str
    sme_id: str
    provider: str
    label: str
    consent_id: str | None = None
    consent_expires_at: datetime | None = None
    source: str
    # additive
    institution_name: str = ""
    account_type: str = "current"
    masked_account: str = ""
    is_primary: bool = False
    consent_status: str = "not_connected"

    @field_serializer("consent_expires_at")
    def _ser_dt(self, v: datetime | None) -> str | None:
        return None if v is None else _iso_z(v)


class LoanSimRequest(BaseModel):
    amount: float = Field(gt=0, description="Principal in NGN")
    annual_rate: float = Field(ge=0, le=1, description="Annual interest rate as a fraction, e.g. 0.24")
    term_months: int = Field(gt=0, le=120, description="Tenor in months")


class LoanSimPoint(BaseModel):
    date: date
    projected_net: float
    # additive: baseline (no-loan) net on the same date, for before/after compare
    baseline_net: float = 0.0


class LoanSimResult(BaseModel):
    sme_id: str
    monthly_repayment: float
    projected_min_liquidity: float
    projected_mean_liquidity: float
    series: list[LoanSimPoint] = Field(default_factory=list)
    disclaimer: str
    # additive (PRD §5.6 before/after + impact classification)
    baseline_min_liquidity: float = 0.0
    baseline_mean_liquidity: float = 0.0
    impact: str = "manageable"
    impact_label: str = "Manageable"


class HealthzResponse(BaseModel):
    status: str = "ok"


class ReadyzResponse(BaseModel):
    ready: bool
    checks: dict[str, bool]


# --------------------------------------------------------------------------- #
# Loan applications (additive — see docs/DECISIONS.md CR-004)
# --------------------------------------------------------------------------- #

RecommendationValue = Literal[
    "recommend_for_review", "request_more_information", "flag_for_monitoring"
]


class LoanApplicationCreate(BaseModel):
    """An SME's request for a facility. Consent is required: the request is the
    trigger for the read-only data-sharing prompt in the PRD consent lifecycle."""

    amount: float = Field(gt=0, description="Requested principal in NGN")
    annual_rate: float = Field(ge=0, le=1, description="Indicative annual rate, e.g. 0.24")
    term_months: int = Field(gt=0, le=120)
    purpose: str = Field(default="", max_length=240)
    consent: bool = Field(description="Customer authorises read-only data sharing")


class RecommendationRequest(BaseModel):
    """Officer output. Decision support only — no approve/decline value exists."""

    recommendation: RecommendationValue
    note: str = Field(default="", max_length=400)


class LoanApplication(BaseModel):
    id: str
    sme_id: str
    sme_name: str
    amount: float
    annual_rate: float
    term_months: int
    purpose: str
    monthly_repayment: float
    status: str
    status_label: str
    submitted_at: datetime
    recommendation: str | None = None
    recommendation_label: str | None = None
    recommendation_note: str | None = None
    recommendation_at: datetime | None = None
    reviewed_by: str | None = None
    disclaimer: str

    @field_serializer("submitted_at")
    def _ser_submitted(self, v: datetime) -> str:
        return _iso_z(v)

    @field_serializer("recommendation_at")
    def _ser_recommendation(self, v: datetime | None) -> str | None:
        return None if v is None else _iso_z(v)


def _iso_z(v: datetime) -> str:
    """ISO-8601 UTC with a trailing ``Z`` (contract example style)."""
    if v.tzinfo is None:
        v = v.replace(tzinfo=timezone.utc)
    return v.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
