"""Forecast tests: horizons, chronological eval, edge cases."""
import numpy as np
import pandas as pd
import pytest

from biznoria_ml.forecast import (
    BaselineForecast,
    HGBForecaster,
    chronological_mae,
    forecast_future,
)


def _daily(n=200, seed=1):
    rng = np.random.default_rng(seed)
    dates = pd.date_range("2025-06-01", periods=n, freq="D")
    net = 100 + 30 * np.sin(np.arange(n) * 2 * np.pi / 7) + rng.normal(0, 15, n)
    return pd.DataFrame({"date": dates, "net": net})


@pytest.mark.parametrize("horizon", [30, 60, 90])
def test_horizon_lengths_exact(horizon):
    out = forecast_future(_daily(), horizon=horizon)
    assert out["horizon"] == horizon
    assert len(out["predictions"]) == horizon
    assert len(out["dates"]) == horizon
    assert all(np.isfinite(out["predictions"]))


def test_bad_horizon_rejected():
    with pytest.raises(ValueError):
        forecast_future(_daily(), horizon=45)


def test_chronological_split_train_precedes_val():
    scores = chronological_mae(_daily())
    assert scores["train_end"] < scores["val_start"]
    assert np.isfinite(scores["mae_baseline"])
    assert np.isfinite(scores["mae_hgb"])
    assert scores["mae_baseline"] >= 0


def test_short_history_falls_back_to_baseline():
    dates = pd.date_range("2026-01-01", periods=20, freq="D")
    short = pd.DataFrame({"date": dates, "net": 20.0})
    out = forecast_future(short, horizon=30)
    assert out["model_used"] == "baseline"
    assert len(out["predictions"]) == 30


def test_baseline_seasonal_naive_spot_check():
    dates = pd.date_range("2026-01-01", periods=14, freq="D")
    net = [float(i) for i in range(14)]  # 0..13
    df = pd.DataFrame({"date": dates, "net": net})
    preds = BaselineForecast().fit(df).predict(30)
    # First forecast day copies net from 7 days earlier (value 7).
    assert preds[0] == 7.0


def test_hgb_trains_and_predicts_recursively():
    df = _daily(200)
    preds = HGBForecaster().fit(df).predict(30)
    assert len(preds) == 30
    assert all(np.isfinite(preds))


def test_nan_input_rejected():
    df = _daily()
    df.loc[5, "net"] = np.nan
    with pytest.raises(ValueError):
        forecast_future(df, horizon=30)
