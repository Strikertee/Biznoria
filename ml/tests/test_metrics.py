"""Health-metric sanity checks plus the transaction-collapsing helper."""
import pandas as pd

from biznoria_ml.features import to_daily_net_flow
from biznoria_ml.metrics import compute_health_metrics


def test_flat_positive_series_scores_high_stability(daily_flat):
    m = compute_health_metrics(daily_flat)
    assert m["stability"] > 90.0
    assert m["expense_ratio"] == 0.5


def test_volatile_series_scores_lower_than_flat(daily_flat, daily_volatile):
    assert (
        compute_health_metrics(daily_volatile)["stability"]
        < compute_health_metrics(daily_flat)["stability"]
    )


def test_growing_series_trend_above_flat(daily_flat, daily_growing):
    assert (
        compute_health_metrics(daily_growing)["growth"]
        > compute_health_metrics(daily_flat)["growth"]
    )


def test_to_daily_fills_gaps():
    tx = pd.DataFrame(
        {
            "date": ["2026-01-01", "2026-01-03"],
            "amount": [100.0, 50.0],
            "direction": ["inflow", "outflow"],
        }
    )
    daily = to_daily_net_flow(tx)
    assert len(daily) == 3  # gap day filled
    assert daily["net"].tolist() == [100.0, 0.0, -50.0]
