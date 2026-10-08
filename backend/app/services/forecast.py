"""Forecast service: 30/60/90-day daily net cash flow + explainable drivers."""
from __future__ import annotations

from datetime import datetime

import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from . import cashflow as cashflow_service
from .ml import ALLOWED_HORIZONS, forecast_future

_HIGH_PRESSURE_NEG_SHARE = 0.5
_WATCH_NEG_SHARE = 0.2


def forecast_status(predictions: list[float]) -> str:
    """Frozen ``forecast_status`` enum: healthy | watch | high_pressure."""
    if not predictions:
        return "watch"
    arr = np.asarray(predictions, dtype=float)
    neg_share = float(np.mean(arr < 0))
    if float(np.mean(arr)) <= 0 or neg_share >= _HIGH_PRESSURE_NEG_SHARE:
        return "high_pressure"
    if neg_share >= _WATCH_NEG_SHARE:
        return "watch"
    return "healthy"


def _drivers(daily: pd.DataFrame) -> list[str]:
    """Key drivers, grounded only in the observed series (PRD §5.4)."""
    if len(daily) < 14:
        return ["Short history — the forecast falls back to the rolling mean."]
    out: list[str] = []
    inflow = daily["inflow"].to_numpy(dtype=float)
    outflow = daily["outflow"].to_numpy(dtype=float)
    net = daily["net"].to_numpy(dtype=float)
    half = len(inflow) // 2

    first_in, second_in = float(inflow[:half].mean()), float(inflow[half:].mean())
    if first_in > 0 and second_in > 1.1 * first_in:
        out.append("Inflow trend is rising over the recent window.")
    elif first_in > 0 and second_in < 0.9 * first_in:
        out.append("Inflow trend is softening over the recent window.")
    else:
        out.append("Inflow trend is broadly flat.")

    outflow_days = float(np.mean(outflow > 0))
    out.append(
        f"Recurring obligations appear on {outflow_days * 100:.0f}% of days."
    )

    # Weekly seasonality: how much day-of-week means differ from the overall mean.
    dow_means = daily.assign(dow=pd.to_datetime(daily["date"]).dt.dayofweek).groupby("dow")["net"].mean()
    overall = float(np.mean(net))
    spread = float(dow_means.max() - dow_means.min())
    scale = float(np.mean(np.abs(net))) or 1.0
    if spread / scale > 0.5:
        out.append("A clear weekly (day-of-week) pattern is present.")
    else:
        out.append("No strong weekly pattern; flows are fairly even.")

    cv = float(np.std(net)) / (abs(overall) + 1e-9)
    out.append("Volatility is high relative to the average daily net." if cv > 1.5
               else "Volatility is moderate relative to the average daily net.")
    return out


def build_forecast(
    db: Session,
    sme_id: str,
    horizon: int,
    *,
    include_external: bool = True,
    now: datetime | None = None,
) -> dict:
    if horizon not in ALLOWED_HORIZONS:
        raise ValueError(f"horizon must be one of {ALLOWED_HORIZONS}")

    daily, _sources = cashflow_service.load_daily_frame(
        db, sme_id, include_external=include_external, now=now
    )
    if len(daily) == 0:
        return {
            "sme_id": sme_id,
            "horizon": horizon,
            "history_len": 0,
            "model_used": "baseline",
            "mae_val": None,
            "points": [],
            "status": "watch",
            "projected_mean_net": 0.0,
            "projected_min_net": 0.0,
            "drivers": ["No transaction history available for this SME."],
        }

    result = forecast_future(daily, horizon)
    predictions = [float(v) for v in result["predictions"]]
    points = [
        {"date": d, "yhat": y} for d, y in zip(result["dates"], predictions)
    ]
    return {
        "sme_id": sme_id,
        "horizon": result["horizon"],
        "history_len": result["history_len"],
        "model_used": result["model_used"],
        "mae_val": result["mae_val"],
        "points": points,
        "status": forecast_status(predictions),
        "projected_mean_net": round(float(np.mean(predictions)), 2),
        "projected_min_net": round(float(np.min(predictions)), 2),
        "drivers": _drivers(daily),
    }


def forecast_mean(
    db: Session, sme_id: str, *, include_external: bool = True, now: datetime | None = None
) -> float | None:
    """Projected mean daily net flow (feeds the credit score's liquidity term)."""
    daily, _ = cashflow_service.load_daily_frame(
        db, sme_id, include_external=include_external, now=now
    )
    if len(daily) == 0:
        return None
    result = forecast_future(daily, 90)
    preds = [float(v) for v in result["predictions"]]
    return float(np.mean(preds)) if preds else None
