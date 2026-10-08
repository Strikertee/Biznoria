"""Financial-health analytics: metrics → health score, status, trend, insights.

Thin composition layer over ``biznoria_ml.metrics`` — no formulas are
re-implemented here. The composite health score uses the *prototype* weights
from PRD §10.2 (separate from, and never confused with, the frozen
credit-readiness weights in §10.3).
"""
from __future__ import annotations

from datetime import datetime, timezone

import numpy as np
import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Transaction
from . import cashflow as cashflow_service
from .ml import compute_health_metrics

# PRD §10.2 prototype financial-health weights (illustrative, not Wema policy).
HEALTH_WEIGHTS: dict[str, float] = {
    "stability": 0.30,
    "liquidity": 0.25,
    "growth": 0.20,
    "revenue_consistency": 0.15,
    "repayment": 0.10,
}

AT_RISK_THRESHOLD = 40.0
_HEALTHY_THRESHOLD = 65.0
_DAYS_PER_MONTH = 30.44


def health_status(score: float) -> str:
    """Frozen ``health_status`` enum: healthy | watch | risk."""
    if score >= _HEALTHY_THRESHOLD:
        return "healthy"
    if score >= AT_RISK_THRESHOLD:
        return "watch"
    return "risk"


def composite_health_score(metrics: dict) -> float:
    score = (
        metrics["stability"] * HEALTH_WEIGHTS["stability"]
        + metrics["liquidity"] * HEALTH_WEIGHTS["liquidity"]
        + metrics["growth"] * HEALTH_WEIGHTS["growth"]
        + metrics["revenue_consistency"] * HEALTH_WEIGHTS["revenue_consistency"]
        + metrics["repayment_score"] * HEALTH_WEIGHTS["repayment"]
    )
    return round(max(0.0, min(100.0, score)), 2)


def trend_label(daily: pd.DataFrame) -> str:
    """growing | stable | declining | volatile (PRD §5.2).

    Uses a half-over-half comparison of mean net flow, normalised by the mean
    absolute net flow, with a volatility fallback. Deliberately *not* derived
    from ``biznoria_ml.metrics.growth_trend``: that component normalises a
    per-day slope by daily volatility, so it returns ~50 even for a series that
    grows 10x over the window (see CR-001 in docs/DECISIONS.md). Direction is
    checked before volatility so a clearly declining business reads as
    "declining" rather than merely "volatile".
    """
    if len(daily) < 14:
        return "stable"
    net = daily["net"].to_numpy(dtype=float)
    scale = float(np.mean(np.abs(net))) + 1e-9
    cv = float(np.std(net)) / scale
    half = len(net) // 2
    delta = (float(net[half:].mean()) - float(net[:half].mean())) / scale

    if delta >= 0.25:
        return "growing"
    if delta <= -0.25:
        return "declining"
    if cv > 1.0:
        return "volatile"
    return "stable"


def build_insights(metrics: dict, trend: str, health: float) -> list[str]:
    """Exactly 4 plain-language insights, each grounded in a computed metric.

    One line per dimension (stability, trend, expense coverage, revenue
    regularity) plus an overall summary — so the surface is never empty and
    never longer than the PRD §5.2 maximum.
    """
    stability = metrics["stability"]
    if stability >= 70:
        out = ["Cash flow is steady day to day, with few negative days."]
    elif stability < 40:
        out = ["Daily cash flow is volatile, with frequent negative days."]
    else:
        out = ["Cash flow is moderately steady but not without swings."]

    out.append(
        {
            "growing": "Net cash flow is trending upward over the recent window.",
            "declining": "Net cash flow is trending downward — worth monitoring.",
            "volatile": "Net cash flow swings widely, so the trajectory is unclear.",
            "stable": "Net cash flow is broadly flat over the recent window.",
        }[trend]
    )

    expense_ratio = metrics["expense_ratio"]
    if expense_ratio > 0.95:
        out.append("Outflows almost match inflows, leaving little headroom.")
    elif expense_ratio < 0.6:
        out.append("Outflows are comfortably below inflows.")
    else:
        out.append("Outflows take a balanced share of inflows.")

    revenue = metrics["revenue_consistency"]
    if revenue >= 70:
        out.append("Revenue arrives regularly, supporting predictable planning.")
    elif revenue < 40:
        out.append("Revenue is irregular — several low- or no-inflow days.")
    else:
        out.append("Revenue arrives with moderate regularity.")

    out.append(f"Overall financial health is {health:.0f}/100.")
    return out[:4]


def expense_breakdown(
    db: Session,
    sme_id: str,
    *,
    include_external: bool = True,
    now: datetime | None = None,
    limit: int = 4,
) -> list[dict]:
    """Top expense categories by DEBIT volume (PRD §5.2)."""
    rows = cashflow_service._load_rows(  # noqa: SLF001 — same package, single gate
        db,
        sme_id,
        include_external=include_external,
        date_from=None,
        date_to=None,
        now=now,
    )
    totals: dict[str, float] = {}
    for r in rows:
        if r.direction != "DEBIT":
            continue
        totals[r.category] = totals.get(r.category, 0.0) + float(r.amount)
    if not totals:
        return []
    grand = sum(totals.values()) or 1.0
    ranked = sorted(totals.items(), key=lambda kv: kv[1], reverse=True)[:limit]
    return [
        {"category": cat, "amount": round(amt, 2), "share": round(amt / grand, 4)}
        for cat, amt in ranked
    ]


def compute_health(
    db: Session,
    sme_id: str,
    *,
    include_external: bool = True,
    forecast_mean: float | None = None,
    now: datetime | None = None,
) -> dict:
    """Full health payload for the ``/health`` endpoint."""
    daily, _sources = cashflow_service.load_daily_frame(
        db, sme_id, include_external=include_external, now=now
    )
    metrics = compute_health_metrics(daily, on_time_ratio=None, forecast_mean=forecast_mean)
    score = composite_health_score(metrics)
    trend = trend_label(daily)

    inflow_total = float(daily["inflow"].sum()) if len(daily) else 0.0
    outflow_total = float(daily["outflow"].sum()) if len(daily) else 0.0
    months = max(len(daily) / _DAYS_PER_MONTH, 1.0)

    return {
        "sme_id": sme_id,
        **metrics,
        "health_score": score,
        "status": health_status(score),
        "trend": trend,
        "avg_monthly_inflow": round(inflow_total / months, 2),
        "avg_monthly_outflow": round(outflow_total / months, 2),
        "top_expense_categories": expense_breakdown(
            db, sme_id, include_external=include_external, now=now
        ),
        "insights": build_insights(metrics, trend, score),
        "updated_at": datetime.now(timezone.utc),
    }


def metrics_for_credit(db: Session, sme_id: str, *, include_external: bool = True,
                       forecast_mean: float | None = None,
                       now: datetime | None = None) -> tuple[dict, pd.DataFrame]:
    """Metrics + the daily frame, so the caller can reuse the frame."""
    daily, _sources = cashflow_service.load_daily_frame(
        db, sme_id, include_external=include_external, now=now
    )
    metrics = compute_health_metrics(daily, on_time_ratio=None, forecast_mean=forecast_mean)
    return metrics, daily


def sme_has_transactions(db: Session, sme_id: str) -> bool:
    return (
        db.execute(
            select(Transaction.id).where(Transaction.sme_id == sme_id).limit(1)
        ).scalar_one_or_none()
        is not None
    )
