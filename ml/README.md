# ML package (owner: ML lane — IMPLEMENTED)
Pure functions. No FastAPI, no SQLAlchemy, no network, no disk I/O.
Deterministic and explainable; chronological evaluation only.

## Modules
- `features.py` — daily net flow + lag/rolling/calendar features (leakage-safe: every
  past-only feature is `shift(1)`-based; row `t` never sees data `> t`).
- `metrics.py` — health metrics 0–100 (stability, revenue consistency, growth,
  repayment, liquidity) + expense ratio.
- `forecast.py` — seasonal-naive/rolling-mean baseline vs `HistGradientBoostingRegressor`;
  chronological splits, MAE, recursive 30/60/90-day forecasts.
- `credit.py` — frozen-weight 0–100 prototype score + reasons + disclaimer.
- `simulation.py` — amortised loan what-if; larger repayments never improve liquidity.

## Run tests
```bash
pip install -r ml/requirements.txt
pytest ml/tests -q
```
