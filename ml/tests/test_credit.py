"""Credit-readiness tests: bounds, frozen weights, monotonicity, disclaimer."""
import pytest

from biznoria_ml.credit import (
    CREDIT_DISCLAIMER,
    WEIGHTS,
    score_credit_readiness,
    score_from_daily,
)
from biznoria_ml.metrics import compute_health_metrics
import pandas as pd

_GOOD = {"stability": 80.0, "revenue_consistency": 80.0, "growth": 70.0, "repayment": 80.0, "liquidity": 75.0}


def test_weights_sum_to_one():
    assert abs(sum(WEIGHTS.values()) - 1.0) < 1e-9
    assert set(WEIGHTS) == {"stability", "revenue_consistency", "growth", "repayment", "liquidity"}


def test_score_bounds_and_formula():
    out = score_credit_readiness(_GOOD)
    expected = sum(_GOOD[k] * WEIGHTS[k] for k in WEIGHTS)
    assert out["score"] == pytest.approx(expected)
    assert 0.0 <= out["score"] <= 100.0
    lo = score_credit_readiness({k: 0.0 for k in WEIGHTS})
    hi = score_credit_readiness({k: 100.0 for k in WEIGHTS})
    assert lo["score"] == 0.0
    assert hi["score"] == 100.0


def test_out_of_range_rejected():
    bad = dict(_GOOD, stability=120.0)
    with pytest.raises(ValueError):
        score_credit_readiness(bad)


def test_monotonic_better_stability_higher_score():
    low = score_credit_readiness(dict(_GOOD, stability=20.0))["score"]
    high = score_credit_readiness(dict(_GOOD, stability=90.0))["score"]
    assert high > low


def test_disclaimer_and_no_approval_language():
    out = score_credit_readiness(_GOOD)
    assert out["disclaimer"] == CREDIT_DISCLAIMER
    # The verbatim disclaimer necessarily contains "approval or decline" as a
    # negation; the ban applies to reasons/band (no credit decisions there).
    blob = " ".join(out["reasons"] + [out["band"]]).lower()
    assert "approv" not in blob and "declin" not in blob
    assert len(out["reasons"]) >= 5


def test_end_to_end_from_daily(daily_flat):
    out = score_from_daily(daily_flat)
    assert 0.0 <= out["score"] <= 100.0
    assert out["disclaimer"] == CREDIT_DISCLAIMER
