"""Portfolio service — headline metrics across all SMEs (officer surface)."""
from __future__ import annotations

from datetime import datetime, timedelta

import numpy as np
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models import SME, Transaction
from . import cashflow as cashflow_service
from .analytics import AT_RISK_THRESHOLD, _HEALTHY_THRESHOLD, composite_health_score
from .ml import compute_health_metrics

_WINDOW_DAYS = 30


def build_summary(db: Session, *, now: datetime | None = None) -> dict:
    smes = list(db.execute(select(SME).order_by(SME.id)).scalars().all())
    anchor = db.execute(select(func.max(Transaction.date))).scalar_one_or_none()

    scores: list[float] = []
    total_inflow = 0.0
    total_outflow = 0.0

    for sme in smes:
        daily, _sources = cashflow_service.load_daily_frame(db, sme.id, now=now)
        metrics = compute_health_metrics(daily, on_time_ratio=None, forecast_mean=None)
        scores.append(composite_health_score(metrics))

        if anchor is not None and len(daily):
            cutoff = anchor - timedelta(days=_WINDOW_DAYS - 1)
            window = daily[daily["date"].dt.date >= cutoff]
            total_inflow += float(window["inflow"].sum())
            total_outflow += float(window["outflow"].sum())

    scores_arr = np.asarray(scores, dtype=float) if scores else np.asarray([0.0])
    median_score = round(float(np.median(scores_arr)), 2) if scores else 0.0

    healthy = int(np.sum(scores_arr >= _HEALTHY_THRESHOLD))
    at_risk = int(np.sum(scores_arr < AT_RISK_THRESHOLD))
    watch = int(len(scores) - healthy - at_risk)

    return {
        "sme_count": len(smes),
        "total_inflow_30d": round(total_inflow, 2),
        "total_outflow_30d": round(total_outflow, 2),
        "net_flow_30d": round(total_inflow - total_outflow, 2),
        "median_health_score": median_score,
        "at_risk_count": at_risk,
        "healthy_count": healthy,
        "watch_count": watch,
        "high_pressure_count": at_risk,
    }
