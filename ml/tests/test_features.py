"""Feature tests: expected columns, EOM flag, and no time leakage."""
import numpy as np
import pandas as pd

from biznoria_ml.features import FEATURE_COLUMNS, make_features


def _daily(n=120, seed=0):
    rng = np.random.default_rng(seed)
    dates = pd.date_range("2026-01-01", periods=n, freq="D")
    net = 100 + 10 * np.sin(np.arange(n)) + rng.normal(0, 5, n)
    return pd.DataFrame({"date": dates, "net": net})


def test_expected_columns_present():
    feat = make_features(_daily())
    for col in FEATURE_COLUMNS:
        assert col in feat.columns, f"missing feature {col}"
    assert "net" in feat.columns  # target preserved


def test_eom_flag_correct():
    dates = pd.to_datetime(["2026-01-30", "2026-01-31", "2026-02-01", "2026-02-28"])
    df = pd.DataFrame({"date": dates, "net": [1.0, 2.0, 3.0, 4.0]})
    feat = make_features(df)
    assert feat["is_eom"].tolist() == [0.0, 1.0, 0.0, 1.0]


def test_no_leakage_mutating_future_does_not_change_past_features():
    df = _daily(120)
    before = make_features(df).iloc[:60][FEATURE_COLUMNS].copy()
    mutated = df.copy()
    mutated.loc[mutated.index[100:], "net"] *= 50.0  # shock the far future
    after = make_features(mutated).iloc[:60][FEATURE_COLUMNS]
    pd.testing.assert_frame_equal(before, after)


def test_past_only_shift_spot_check():
    df = pd.DataFrame(
        {"date": pd.date_range("2026-01-01", periods=10, freq="D"), "net": np.arange(10.0)}
    )
    feat = make_features(df)
    # lag_1 at row 5 must equal net at row 4 (strictly past), never row 5 itself.
    assert feat.loc[5, "lag_1"] == 4.0
    # calendar fields are knowable in advance and allowed.
    assert feat.loc[0, "dow"] == pd.Timestamp("2026-01-01").dayofweek
