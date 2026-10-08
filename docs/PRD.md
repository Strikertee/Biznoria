# SME Financial Intelligence Platform — PRD (Hackathon, 10h)

## 1. Goal
AI-powered SME financial intelligence for a banking use case (Wema context).
Analyse **synthetic** SME transactions, optionally combine **customer-authorised**
external-account data via a mock Open Banking adapter, and produce health metrics,
cash-flow intelligence, 30/60/90-day forecasts, prototype credit readiness, and
loan what-if simulation.

## 2. Non-negotiable rules
1. Synthetic data only. No real credentials, no real banking data, no secrets in git.
2. Open Banking is consent-based. The system must never present external accounts
   without an authorisation/consent record (with timestamp + expiry).
   Consent lifecycle (ALAT for Business): SME applies for a facility → secure
   in-app consent prompt → customer approves → a read-only Open Banking token is
   issued for a limited, specified window → the customer can revoke it at any time.
   Expired or revoked tokens must immediately stop all external data access.
3. Credit readiness is **decision support, not underwriting**. Never output
   approval/decline language. Always attach the prototype disclaimer.
4. P0 > P1 > P2. P0 ships first.
5. Simple, deterministic, explainable methods over complex models.
6. No new frameworks / large deps without a concrete blocker.
7. Frozen API/data contracts (see `docs/API_CONTRACT.md`). Changes only for genuine defects.
8. Every meaningful checkpoint is logged in `docs/PROCESS_LOG.md`.

## 3. Scope — P0 (must ship)
- Synthetic SME + transaction dataset + seed loader.
- Portfolio summary, SME list/detail.
- Financial health metrics (stability, growth, liquidity, expenses).
- Historical cash-flow series (daily net flow).
- 30/60/90-day cash-flow forecast (baseline + ML, chronological eval, MAE).
- Prototype credit-readiness score 0–100 with frozen weights, components + reasons.
- Loan what-if simulation (decision support only).
- Mock Open Banking adapter: common interface + synthetic Wema/external provider
  with consent metadata. No live bank connectivity.
- Dashboard: portfolio, SME detail, health, cash-flow chart, forecast chart,
  credit readiness, accounts/consent, simulator; loading/error/empty states.
- Health/readiness endpoints, CORS, Render deployment (frontend + API + Postgres).
- Tests: backend P0 routes, ML (leakage, horizons, bounds, monotonicity,
  simulation invariant), frontend contract tests.

## 4. P1 (if time)
- Export/share views, forecast confidence bands, auth stub.
## 5. P2 (defer)
- Playwright E2E, real sandbox connectivity, advanced models.

## 6. Credit-readiness prototype weights (frozen)
| Component | Weight |
|---|---|
| cash-flow stability | 25% |
| revenue consistency | 20% |
| growth trend | 20% |
| repayment behaviour | 20% |
| forecast liquidity | 15% |
Score range 0–100. Weights explicit and testable (`ml/src/biznoria_ml/credit.py`).

## 7. Forecast policy
- Grain: daily net cash flow per SME.
- Features: lag 1/7/14/28, rolling mean/std 7/14/30, dow/dom/month, end-of-month flag.
- Candidate: `HistGradientBoostingRegressor`. Baseline: seasonal-naive (lag-7) /
  rolling-mean fallback. Chronological splits only. Metric: MAE (MAPE unstable
  near zero). Demo uses the baseline if it performs as well or better.

## 8. Loan simulation rule
Decision support only. Under otherwise identical conditions, a larger projected
repayment must not improve projected liquidity. Enforced by test
(`ml/tests/test_simulation.py`).

## 9. Data
Synthetic generator: `scripts/generate_synthetic.py` → `data/` (gitignored CSV/Parquet,
small committed sample only). Schema in `docs/API_CONTRACT.md` + `docs/ARCHITECTURE.md`.

## 10. Definition of done
Implementation exists; relevant tests exist and pass; no unrelated feature broken;
process log updated; a teammate can continue without verbal explanation.

## 11. Roles and visibility (ALAT for Business integration)
Two roles, one frozen contract. The API does not change per role — the backend
authorises which surfaces each role may call, and the frontend renders per role.

**SME customer** (in the ALAT for Business app): sees ONLY their own business —
cash-flow history, financial health metrics, 30/60/90-day forecast, and
prototype credit readiness, strictly for loan-review transparency. Never another
SME's data. Never the simulator. Never officer tooling.

**Account officer**: portfolio view across SMEs, per-SME drill-down (health,
cash-flow, forecast, credit readiness), connected accounts (internal +
consented-external only — consent still required), the loan what-if simulator,
and combined officer tasks. The simulator and credit score stay decision
support: no approval/decline output on either side.

Hard rules:
- SME `sme_id` is derived from the authenticated customer, never from a
  client-supplied parameter they can tamper with.
- External (non-Wema) data is served only under a valid consent + token,
  on both roles.
- Credit-readiness and simulation responses carry their disclaimers verbatim
  on both roles.
