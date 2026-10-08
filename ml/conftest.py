import os
import sys

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))


@pytest.fixture()
def daily_flat():
    dates = pd.date_range("2026-01-01", periods=120, freq="D")
    return pd.DataFrame({"date": dates, "inflow": 200.0, "outflow": 100.0, "net": 100.0})


@pytest.fixture()
def daily_volatile():
    rng = np.random.default_rng(7)
    dates = pd.date_range("2026-01-01", periods=200, freq="D")
    inflow = 200 + 20 * np.sin(np.arange(200) * 2 * np.pi / 7) + rng.normal(0, 60, 200)
    outflow = 150 + rng.normal(0, 80, 200)
    inflow = np.clip(inflow, 0, None)
    outflow = np.clip(outflow, 0, None)
    return pd.DataFrame({"date": dates, "inflow": inflow, "outflow": outflow, "net": inflow - outflow})


@pytest.fixture()
def daily_growing():
    dates = pd.date_range("2026-01-01", periods=200, freq="D")
    trend = np.linspace(0, 150, 200)
    weekly = 20 * np.sin(np.arange(200) * 2 * np.pi / 7)
    net = 50 + trend + weekly
    return pd.DataFrame({"date": dates, "inflow": net + 150.0, "outflow": 150.0, "net": net})


@pytest.fixture()
def daily_short():
    dates = pd.date_range("2026-01-01", periods=20, freq="D")
    return pd.DataFrame({"date": dates, "inflow": 100.0, "outflow": 80.0, "net": 20.0})
