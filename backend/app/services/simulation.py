"""Loan what-if simulation service — decision support only.

Wraps ``biznoria_ml.simulation.simulate_loan`` (which guarantees by
construction that a larger repayment never improves projected liquidity) and
adds the before/after baseline and the PRD §12 impact classification.
"""
from __future__ import annotations

from datetime import datetime

import numpy as np
from sqlalchemy.orm import Session

from . import cashflow as cashflow_service
from . import forecast as forecast_service
from .ml import LOAN_DISCLAIMER, forecast_future, simulate_loan

_IMPACT_LABELS = {
    "manageable": "Manageable",
    "watch": "Watch",
    "high_pressure": "High pressure",
}
_WATCH_BUFFER_RATIO = 0.6


def classify_impact(
    baseline_mean: float, projected_mean: float, projected_min: float
) -> str:
    """manageable | watch | high_pressure (PRD §12).

    Monotonic: a worse projected position can never yield a *better* label.
    """
    if projected_min < 0 or projected_mean <= 0:
        return "high_pressure"
    if baseline_mean > 0 and projected_mean < _WATCH_BUFFER_RATIO * baseline_mean:
        return "watch"
    return "manageable"


def build_simulation(
    db: Session,
    sme_id: str,
    amount: float,
    annual_rate: float,
    term_months: int,
    *,
    include_external: bool = True,
    now: datetime | None = None,
) -> dict:
    daily, _sources = cashflow_service.load_daily_frame(
        db, sme_id, include_external=include_external, now=now
    )

    if len(daily) == 0:
        return {
            "sme_id": sme_id,
            "monthly_repayment": 0.0,
            "projected_min_liquidity": 0.0,
            "projected_mean_liquidity": 0.0,
            "series": [],
            "disclaimer": LOAN_DISCLAIMER,
            "baseline_min_liquidity": 0.0,
            "baseline_mean_liquidity": 0.0,
            "impact": "watch",
            "impact_label": _IMPACT_LABELS["watch"],
        }

    fc = forecast_future(daily, 90)
    baseline = [float(v) for v in fc["predictions"]]
    result = simulate_loan(baseline, fc["dates"], amount, annual_rate, term_months)

    projected = [float(p["projected_net"]) for p in result["series"]]
    baseline_mean = round(float(np.mean(baseline)), 2) if baseline else 0.0
    baseline_min = round(float(np.min(baseline)), 2) if baseline else 0.0

    series = [
        {"date": p["date"], "projected_net": p["projected_net"], "baseline_net": b}
        for p, b in zip(result["series"], baseline)
    ]
    impact = classify_impact(
        baseline_mean, float(result["projected_mean_liquidity"]), float(result["projected_min_liquidity"])
    )

    return {
        "sme_id": sme_id,
        "monthly_repayment": result["monthly_repayment"],
        "projected_min_liquidity": result["projected_min_liquidity"],
        "projected_mean_liquidity": result["projected_mean_liquidity"],
        "series": series,
        "disclaimer": LOAN_DISCLAIMER,
        "baseline_min_liquidity": baseline_min,
        "baseline_mean_liquidity": baseline_mean,
        "impact": impact,
        "impact_label": _IMPACT_LABELS[impact],
    }


__all__ = ["build_simulation", "classify_impact"]
