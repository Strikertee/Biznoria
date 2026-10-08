"""Leakage-safe feature engineering on daily net cash flow.

Every past-value feature is built from ``net.shift(1)`` so feature row ``t``
only ever sees data with index ``< t`` plus row ``t``'s own calendar fields
(day-of-week etc., which are known in advance and carry no target leakage).
"""
from __future__ import annotations

import pandas as pd

LAG_COLUMNS = ["lag_1", "lag_7", "lag_14", "lag_28"]
ROLL_WINDOWS = (7, 14, 30)
CALENDAR_COLUMNS = ["dow", "dom", "month", "is_eom"]
FEATURE_COLUMNS: list[str] = (
    LAG_COLUMNS
    + [f"roll_mean_{w}" for w in ROLL_WINDOWS]
    + [f"roll_std_{w}" for w in ROLL_WINDOWS]
    + CALENDAR_COLUMNS
)
TARGET_COLUMN = "net"


def to_daily_net_flow(transactions: pd.DataFrame) -> pd.DataFrame:
    """Collapse raw transactions to a continuous daily series.

    Accepts either ``amount`` + ``direction`` (``inflow``/``outflow``) columns or
    pre-aggregated ``inflow``/``outflow`` columns, with a ``date`` column.
    Returns ``date, inflow, outflow, net`` with no date gaps (zeros filled).
    """
    tx = transactions.copy()
    tx["date"] = pd.to_datetime(tx["date"]).dt.normalize()
    if "amount" in tx.columns and "direction" in tx.columns:
        tx["inflow"] = (tx["amount"].where(tx["direction"] == "inflow", 0.0)).astype(float)
        tx["outflow"] = (tx["amount"].where(tx["direction"] == "outflow", 0.0)).astype(float)
    else:
        tx["inflow"] = tx.get("inflow", 0.0).astype(float)
        tx["outflow"] = tx.get("outflow", 0.0).astype(float)
    grouped = tx.groupby("date", as_index=False)[["inflow", "outflow"]].sum()
    full_idx = pd.date_range(grouped["date"].min(), grouped["date"].max(), freq="D")
    daily = grouped.set_index("date").reindex(full_idx, fill_value=0.0)
    daily.index.name = "date"
    daily = daily.reset_index().rename(columns={"index": "date"})
    daily["net"] = daily["inflow"] - daily["outflow"]
    return daily[["date", "inflow", "outflow", "net"]].sort_values("date").reset_index(drop=True)


def make_features(daily: pd.DataFrame) -> pd.DataFrame:
    """Add lag / rolling / calendar features to a daily ``date, net`` frame.

    Past-only features use ``shift(1)`` so row ``t`` never observes ``net`` at
    ``t`` or later. Rolling means/stds with ``min_periods=1`` degrade gracefully
    on short histories (NaNs only where no past exists at all).
    """
    df = daily.copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").reset_index(drop=True)
    past = df["net"].shift(1)
    df["lag_1"] = past
    df["lag_7"] = past.shift(6)  # == net.shift(7)
    df["lag_14"] = past.shift(13)
    df["lag_28"] = past.shift(27)
    for w in ROLL_WINDOWS:
        df[f"roll_mean_{w}"] = past.rolling(window=w, min_periods=1).mean()
        df[f"roll_std_{w}"] = past.rolling(window=w, min_periods=1).std(ddof=0).fillna(0.0)
    df["dow"] = df["date"].dt.dayofweek.astype(float)
    df["dom"] = df["date"].dt.day.astype(float)
    df["month"] = df["date"].dt.month.astype(float)
    df["is_eom"] = (df["date"] + pd.Timedelta(days=1)).dt.month.ne(df["date"].dt.month).astype(float)
    return df
