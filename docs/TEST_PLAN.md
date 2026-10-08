# Test Plan

## Backend (pytest + httpx, `backend/tests/`)
- Contract: every frozen route responds per `docs/API_CONTRACT.md`
  (shape, status, error codes 404/422).
- `GET /healthz` → 200 `{status: ok}`; `GET /readyz` → 200 with checks.
- `forecast?horizon=`: 30/60/90 return exactly N points; `horizon=45` → 422.
- `credit-readiness`: score 0–100, weights sum 1.0, disclaimer verbatim, no
  approval/decline language.
- `loan-simulation`: larger repayment never improves projected liquidity.
- `accounts`: external rows carry consent metadata; no consent → no external rows.
- CORS: frontend origin allowed. Units consistent (NGN, daily grain).
- NaN/None: no `NaN`/`null` leaks in numeric fields.

## ML (`ml/tests/`, pytest)
- `test_features.py`: expected columns; EOM flag; **leakage** — feature row at `t`
  uses only data ≤ `t` (mutate future, features for past unchanged).
- `test_forecast.py`: horizons 30/60/90 exact lengths; chronological split
  (train.max < val.min); MAE finite; short history (<35d) falls back to baseline;
  no MAPE-on-zeros crash; recursive forecast deterministic given seed.
- `test_credit.py`: 0–100 bounds; weights sum to 1.0; monotonicity (↑stability ⇒
  ↑score ceteris paribus); disclaimer verbatim; reasons non-empty; no
  approve/decline tokens.
- `test_metrics.py`: stability/growth/liquidity sane on flat/growing/volatile fixtures.
- `test_simulation.py`: simulation invariant (larger repayment ⇏ better liquidity).

## Frontend (Vitest + RTL, `frontend/src/**/*.test.*`)
- API client hits frozen paths; loading/error/empty states render;
  charts render with fixture data; consent banner distinguishes
  internal vs authorised-external; simulator disclaimer visible.

## Smoke flow (critical, QA lane)
portfolio → SME → cashflow → forecast → credit → simulator → accounts,
plus `/healthz` + `/readyz`. Log in `docs/PROCESS_LOG.md`.
