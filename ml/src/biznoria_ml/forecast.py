"""30/60/90-day daily-net-cash-flow forecasting.

Baseline: seasonal-naive on lag-7 (day-of-week pattern), falling back to the
trailing-30-day rolling mean where lag-7 history is unavailable.
Candidate: HistGradientBoostingRegressor on leakage-safe lag/rolling/calendar
features, applied recursively for multi-step horizons.

Policy: chronological train/validation splits only (never shuffled); MAE is the
selection metric (MAPE is unstable near zero); the demo uses the baseline
whenever it performs as well as or better than the ML model.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor

from .features import FEATURE_COLUMNS, make_features

ALLOWED_HORIZONS: tuple[int, ...] = (30, 60, 90)
_MIN_HISTORY_FOR_ML = 35
_VAL_DAYS = 30


def _validate_daily(daily: pd.DataFrame) -> pd.DataFrame:
    df = daily.copy()
    if "date" not in df.columns or "net" not in df.columns:
        raise ValueError("daily frame must contain 'date' and 'net' columns")
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").reset_index(drop=True)
    if df["net"].isna().any():
        raise ValueError("daily 'net' must not contain NaN (fill gaps upstream)")
    if len(df) == 0:
        raise ValueError("daily frame is empty")
    return df


def _validate_horizon(horizon: int) -> int:
    if horizon not in ALLOWED_HORIZONS:
        raise ValueError(f"horizon must be one of {ALLOWED_HORIZONS}, got {horizon!r}")
    return horizon


def _mae(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.mean(np.abs(np.asarray(a, dtype=float) - np.asarray(b, dtype=float))))


class BaselineForecast:
    """Seasonal-naive (lag-7) with rolling-mean fallback. Stateless, deterministic."""

    def __init__(self) -> None:
        self._hist: pd.DataFrame | None = None

    def fit(self, daily: pd.DataFrame) -> "BaselineForecast":
        self._hist = _validate_daily(daily)[["date", "net"]].reset_index(drop=True)
        return self

    def predict(self, horizon: int) -> np.ndarray:
        _validate_horizon(horizon)
        if self._hist is None:
            raise RuntimeError("BaselineForecast must be fitted before predict")
        hist = self._hist["net"].to_numpy(dtype=float)
        fallback = float(np.mean(hist[-30:])) if len(hist) else 0.0
        preds: list[float] = []
        extended = list(hist)
        for i in range(horizon):
            # Seasonal-naive: same weekday one week before the target day.
            idx = len(extended) - 7
            preds.append(float(extended[idx]) if idx >= 0 else fallback)
            extended.append(preds[-1])
        return np.array(preds, dtype=float)


class HGBForecaster:
    """HistGradientBoostingRegressor wrapper with recursive multi-step decoding."""

    def __init__(self, random_state: int = 42) -> None:
        self.random_state = random_state
        self.model = HistGradientBoostingRegressor(random_state=random_state)
        self._hist: pd.DataFrame | None = None
        self._fitted = False

    def fit(self, daily: pd.DataFrame) -> "HGBForecaster":
        hist = _validate_daily(daily)
        self._hist = hist[["date", "net"]].reset_index(drop=True)
        feat = make_features(self._hist).dropna(subset=FEATURE_COLUMNS)
        if len(feat) == 0:
            raise ValueError("not enough history to build ML features")
        self.model.fit(feat[FEATURE_COLUMNS].to_numpy(), feat["net"].to_numpy())
        self._fitted = True
        return self

    def predict(self, horizon: int) -> np.ndarray:
        _validate_horizon(horizon)
        if not self._fitted or self._hist is None:
            raise RuntimeError("HGBForecaster must be fitted before predict")
        hist = self._hist[["date", "net"]].copy().reset_index(drop=True)
        preds: list[float] = []
        for _ in range(horizon):
            next_date = hist["date"].iloc[-1] + pd.Timedelta(days=1)
            hist = pd.concat(
                [hist, pd.DataFrame({"date": [next_date], "net": [np.nan]})],
                ignore_index=True,
            )
            feat = make_features(hist.assign(net=hist["net"].fillna(0.0)))
            row = feat.iloc[[-1]][FEATURE_COLUMNS].to_numpy()
            # Recompute the last row's past-only features from realised + predicted
            # history: make_features already uses shift(1), and the placeholder 0.0
            # in the target slot is never read by any feature, so this is exact.
            yhat = float(self.model.predict(row)[0])
            preds.append(yhat)
            hist.loc[hist.index[-1], "net"] = yhat
        return np.array(preds, dtype=float)


def chronological_mae(daily: pd.DataFrame, val_days: int = _VAL_DAYS) -> dict:
    """Chronological holdout: last ``val_days`` as validation, rest as train.

    Returns MAEs for both baseline and HGB (HGB falls back to baseline MAE when
    history is too short). Train window always strictly precedes validation.
    """
    df = _validate_daily(daily)
    val_days = max(7, min(val_days, len(df) - 7))
    train, val = df.iloc[:-val_days], df.iloc[-val_days:]
    assert train["date"].max() < val["date"].min(), "chronological split violated"
    y_true = val["net"].to_numpy(dtype=float)

    baseline = BaselineForecast().fit(train)
    # Baseline predictions are history-driven; emulate recursively over val window.
    b_preds: list[float] = []
    extended = list(train["net"].to_numpy(dtype=float))
    fallback = float(np.mean(extended[-30:])) if extended else 0.0
    for _ in range(len(val)):
        idx = len(extended) - 7
        b_preds.append(float(extended[idx]) if idx >= 0 else fallback)
        extended.append(val["net"].iloc[len(b_preds) - 1])  # advance with ACTUALS
    mae_baseline = _mae(y_true, np.array(b_preds))

    if len(train) < _MIN_HISTORY_FOR_ML:
        mae_hgb = mae_baseline
        hgb_ok = False
    else:
        try:
            hgb = HGBForecaster().fit(train)
            # Step through validation feeding actuals (one-step-ahead eval).
            h_preds: list[float] = []
            running = train[["date", "net"]].copy().reset_index(drop=True)
            for _, row in val.iterrows():
                nxt = pd.concat(
                    [running, pd.DataFrame({"date": [row["date"]], "net": [np.nan]})],
                    ignore_index=True,
                )
                feat = make_features(nxt.assign(net=nxt["net"].fillna(0.0)))
                h_preds.append(float(hgb.model.predict(feat.iloc[[-1]][FEATURE_COLUMNS].to_numpy())[0]))
                running = pd.concat(
                    [running, pd.DataFrame({"date": [row["date"]], "net": [row["net"]]})],
                    ignore_index=True,
                )
            mae_hgb = _mae(y_true, np.array(h_preds))
            hgb_ok = True
        except Exception:
            mae_hgb = mae_baseline
            hgb_ok = False
    return {
        "mae_baseline": float(mae_baseline),
        "mae_hgb": float(mae_hgb),
        "hgb_ok": bool(hgb_ok),
        "train_end": str(train["date"].max().date()),
        "val_start": str(val["date"].min().date()),
    }


def forecast_future(daily: pd.DataFrame, horizon: int = 90) -> dict:
    """Produce a horizon-day forecast, preferring the baseline on ties.

    Returns ``{horizon, history_len, model_used, mae_val, dates, predictions}``
    with finite values and no NaNs. Raises ``ValueError`` on bad horizon.
    """
    _validate_horizon(horizon)
    df = _validate_daily(daily)
    last_date = df["date"].max()
    dates = [(last_date + pd.Timedelta(days=i + 1)).date().isoformat() for i in range(horizon)]

    if len(df) < _MIN_HISTORY_FOR_ML:
        preds = BaselineForecast().fit(df).predict(horizon)
        return {
            "horizon": horizon,
            "history_len": len(df),
            "model_used": "baseline",
            "mae_val": None,
            "dates": dates,
            "predictions": [round(float(v), 2) for v in preds],
        }
    scores = chronological_mae(df)
    use_hgb = scores["hgb_ok"] and scores["mae_hgb"] < scores["mae_baseline"]
    if use_hgb:
        preds = HGBForecaster().fit(df).predict(horizon)
        mae_val: float | None = scores["mae_hgb"]
        model_used = "hgb"
    else:
        preds = BaselineForecast().fit(df).predict(horizon)
        mae_val = scores["mae_baseline"]
        model_used = "baseline"
    preds = np.asarray(preds, dtype=float)
    if not np.all(np.isfinite(preds)):
        raise RuntimeError("forecast produced non-finite values")
    return {
        "horizon": horizon,
        "history_len": len(df),
        "model_used": model_used,
        "mae_val": None if mae_val is None else round(float(mae_val), 2),
        "dates": dates,
        "predictions": [round(float(v), 2) for v in preds],
    }
