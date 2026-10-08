"""Deterministic, explainable financial-health metrics (0–100 unless noted).

All formulas are transparent by design (hackathon rule: simple beats clever).
Each component maps monotonically: better underlying behaviour ⇒ higher score.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

_EPS = 1e-9


def _clip100(x: float) -> float:
    return float(max(0.0, min(100.0, x)))


def cashflow_stability(daily: pd.DataFrame) -> float:
    """Higher = steadier net flow. Flat positive series scores ~100."""
    net = daily["net"].to_numpy(dtype=float)
    if len(net) == 0:
        return 50.0
    scale = float(np.mean(np.abs(net))) + _EPS
    cv = float(np.std(net) / scale)
    neg_rate = float(np.mean(net < 0))
    return _clip100(100.0 * (1.0 / (1.0 + cv)) * (1.0 - 0.5 * neg_rate))


def revenue_consistency(daily: pd.DataFrame) -> float:
    """Higher = inflows arrive regularly and evenly."""
    if "inflow" in daily.columns:
        inflow = daily["inflow"].to_numpy(dtype=float)
    else:  # fall back to positive-net proxy when only net is available
        inflow = np.clip(daily["net"].to_numpy(dtype=float), 0.0, None)
    if len(inflow) == 0 or float(np.sum(inflow)) <= 0:
        return 0.0
    active_rate = float(np.mean(inflow > 0))
    positive = inflow[inflow > 0]
    cv = float(np.std(positive) / (np.mean(positive) + _EPS))
    return _clip100(100.0 * active_rate * (1.0 / (1.0 + cv)))


def growth_trend(daily: pd.DataFrame) -> float:
    """50 = flat; >50 growing; <50 shrinking. Slope of 30d rolling-mean net."""
    net = daily["net"].to_numpy(dtype=float)
    if len(net) < 8:
        return 50.0
    smooth = pd.Series(net).rolling(window=min(30, len(net)), min_periods=1).mean().to_numpy()
    x = np.arange(len(smooth))
    slope = float(np.polyfit(x, smooth, 1)[0])
    scale = float(np.std(net)) + _EPS
    return _clip100(50.0 + 25.0 * slope / scale)


def repayment_behaviour(on_time_ratio: float | None) -> float:
    """Map observed on-time repayment ratio to 0–100. ``None`` ⇒ neutral 50."""
    if on_time_ratio is None:
        return 50.0
    return _clip100(100.0 * float(on_time_ratio))


def liquidity_score(daily: pd.DataFrame, forecast_mean: float | None = None) -> float:
    """Higher = comfortably positive recent + projected net flow."""
    net = daily["net"].to_numpy(dtype=float)
    if len(net) == 0:
        return 50.0
    recent = net[-30:]
    pos_rate = float(np.mean(recent > 0))
    cushion = float(np.mean(recent) / (np.mean(np.abs(recent)) + _EPS))  # -1..1-ish
    base = 100.0 * (0.6 * pos_rate + 0.4 * (0.5 + 0.5 * max(-1.0, min(1.0, cushion))))
    if forecast_mean is not None:
        proj = 1.0 if forecast_mean > 0 else (0.5 if forecast_mean == 0 else 0.0)
        base = 0.7 * base + 30.0 * proj
    return _clip100(base)


def expense_ratio(daily: pd.DataFrame) -> float:
    """Total outflow / total inflow (raw ratio, not 0–100). NaN-safe."""
    inflow = float(daily["inflow"].sum()) if "inflow" in daily.columns else float(np.sum(np.clip(daily["net"].to_numpy(dtype=float), 0.0, None)))
    outflow = float(daily["outflow"].sum()) if "outflow" in daily.columns else float(np.sum(np.clip(-daily["net"].to_numpy(dtype=float), 0.0, None)))
    if inflow <= 0:
        return 1.0 if outflow > 0 else 0.0
    return float(outflow / inflow)


def compute_health_metrics(
    daily: pd.DataFrame,
    on_time_ratio: float | None = None,
    forecast_mean: float | None = None,
) -> dict:
    """Return the contract-shaped health metric mapping (see API_CONTRACT.md)."""
    return {
        "stability": round(cashflow_stability(daily), 2),
        "growth": round(growth_trend(daily), 2),
        "liquidity": round(liquidity_score(daily, forecast_mean), 2),
        "expense_ratio": round(expense_ratio(daily), 4),
        "revenue_consistency": round(revenue_consistency(daily), 2),
        "repayment_score": round(repayment_behaviour(on_time_ratio), 2),
    }
