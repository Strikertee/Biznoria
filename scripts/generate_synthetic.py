"""Deterministic synthetic SME transaction generator (seeded RNG).

Usage: python scripts/generate_synthetic.py --smes 50 --days 365 --seed 42 --out data/synthetic
Writes smes.csv + transactions.csv. Synthetic only — never real banking data.
"""
from __future__ import annotations

import argparse
import os

import numpy as np
import pandas as pd


def generate(sme_count: int, days: int, seed: int) -> tuple[pd.DataFrame, pd.DataFrame]:
    rng = np.random.default_rng(seed)
    sectors = ["retail", "food", "logistics", "fashion", "tech-services", "agro"]
    end = pd.Timestamp("2026-10-08").normalize()
    dates = pd.date_range(end - pd.Timedelta(days=days - 1), end, freq="D")
    smes, txs = [], []
    for i in range(sme_count):
        sme_id = f"sme_{i + 1:03d}"
        base = float(rng.uniform(5_000, 80_000))
        trend = float(rng.uniform(-0.1, 0.35)) * base / days
        vol = float(rng.uniform(0.15, 0.6))
        smes.append(
            {
                "id": sme_id,
                "name": f"SME {i + 1:03d}",
                "sector": str(rng.choice(sectors)),
                "size_band": str(rng.choice(["micro", "small", "medium"])),
                "region": "lagos",
                "joined_on": "2024-01-15",
            }
        )
        level = base
        for d in dates:
            weekly = 0.25 * base * np.sin(2 * np.pi * d.dayofweek / 7)
            eom = 1.3 * base if d.is_month_end else 0.0
            inflow = max(0.0, level + weekly + eom + rng.normal(0, vol * base))
            outflow = max(0.0, 0.75 * base + rng.normal(0, vol * base * 0.8))
            txs.append({"sme_id": sme_id, "date": d.date().isoformat(),
                        "inflow": round(inflow, 2), "outflow": round(outflow, 2)})
            level = max(base * 0.3, level + trend + rng.normal(0, base * 0.01))
    return pd.DataFrame(smes), pd.DataFrame(txs)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--smes", type=int, default=50)
    ap.add_argument("--days", type=int, default=365)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--out", default="data/synthetic")
    args = ap.parse_args()
    smes, txs = generate(args.smes, args.days, args.seed)
    os.makedirs(args.out, exist_ok=True)
    smes.to_csv(os.path.join(args.out, "smes.csv"), index=False)
    txs.to_csv(os.path.join(args.out, "transactions.csv"), index=False)
    print(f"wrote {len(smes)} smes, {len(txs)} transactions to {args.out}")


if __name__ == "__main__":
    main()
