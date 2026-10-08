"""Credit-readiness service — frozen weights, decision support only.

No formula lives here: components come from ``biznoria_ml.metrics`` and the
0–100 score from ``biznoria_ml.credit``. This module only supplies the
forecast-aware liquidity input and derives positive/negative drivers.
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from . import cashflow as cashflow_service
from . import forecast as forecast_service
from .ml import CREDIT_DISCLAIMER, WEIGHTS, compute_health_metrics, score_from_metrics

_POSITIVE_THRESHOLD = 60.0
_NEGATIVE_THRESHOLD = 45.0

_COMPONENT_LABELS = {
    "stability": "Cash-flow stability",
    "revenue_consistency": "Revenue consistency",
    "growth": "Growth trend",
    "repayment": "Repayment behaviour",
    "liquidity": "Forecast liquidity",
}


def _drivers(components: dict[str, float]) -> tuple[list[str], list[str]]:
    positives: list[str] = []
    negatives: list[str] = []
    for key, label in _COMPONENT_LABELS.items():
        value = float(components[key])
        weight = int(round(WEIGHTS[key] * 100))
        line = f"{label}: {value:.0f}/100 (weight {weight}%)"
        if value >= _POSITIVE_THRESHOLD:
            positives.append(line)
        elif value < _NEGATIVE_THRESHOLD:
            negatives.append(line)
    return positives, negatives


def build_credit_readiness(
    db: Session,
    sme_id: str,
    *,
    include_external: bool = True,
    now: datetime | None = None,
) -> dict:
    daily, _sources = cashflow_service.load_daily_frame(
        db, sme_id, include_external=include_external, now=now
    )

    projected_mean: float | None = None
    if len(daily) > 0:
        projected_mean = forecast_service.forecast_mean(
            db, sme_id, include_external=include_external, now=now
        )

    metrics = compute_health_metrics(daily, on_time_ratio=None, forecast_mean=projected_mean)
    scored = score_from_metrics(metrics)
    positives, negatives = _drivers(scored["components"])

    return {
        "sme_id": sme_id,
        "score": scored["score"],
        "components": scored["components"],
        "reasons": scored["reasons"],
        "disclaimer": CREDIT_DISCLAIMER,
        "band": scored["band"],
        "weights": dict(WEIGHTS),
        "positive_drivers": positives,
        "negative_drivers": negatives,
        "updated_at": datetime.now(timezone.utc),
    }
