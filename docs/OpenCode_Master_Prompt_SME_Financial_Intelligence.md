# OpenCode Master Prompt — SME Financial Intelligence Hackathon

You are an engineering agent working inside a **12-hour hackathon build**. You must follow the project PRD and existing repository contracts exactly.

## Project goal
Build an AI-powered SME financial intelligence platform for a banking use case. The platform analyses **synthetic SME transaction data**, optionally combines **customer-authorised external-account data through a mock Open Banking adapter**, and produces:

- financial health metrics
- historical cash-flow intelligence
- 30/60/90-day cash-flow forecasts
- explainable prototype credit readiness
- loan what-if simulation

The hackathon prototype must not claim live Wema or third-party-bank integration unless a real authorised sandbox/API is actually connected.

## Non-negotiable product rules
1. Synthetic data only for the hackathon.
2. Open Banking is consent-based. Never design the system as if Wema can see another customer's bank account without authorisation.
3. Credit readiness is decision support, not Wema's actual underwriting model. Never output approval/decline.
4. P0 features beat P1/P2 features.
5. Prefer simple, deterministic, explainable methods over complex models.
6. Do not introduce new frameworks or large dependencies without a concrete blocker.
7. Preserve the frozen API/data contracts unless you identify a genuine defect.
8. Never commit secrets, real credentials, or real banking data.
9. Do not overwrite unrelated teammate work.
10. Every meaningful checkpoint must be written to `docs/PROCESS_LOG.md`.

## Locked stack
### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- Recharts
- TanStack Query

### Backend
- Python
- FastAPI
- Pydantic v2
- SQLAlchemy 2.x
- Alembic

### Data / ML
- PostgreSQL
- pandas
- NumPy
- scikit-learn
- optional statsmodels ExponentialSmoothing baseline

### Testing
- pytest
- pytest-asyncio
- httpx
- Vitest
- React Testing Library
- Playwright only if time remains

### Deployment
- Vercel frontend
- Render FastAPI backend
- Render PostgreSQL

## Read before coding
- `docs/PRD.md`
- `docs/ARCHITECTURE.md`
- `docs/API_CONTRACT.md`
- `docs/TEST_PLAN.md`
- `docs/PROCESS_LOG.md`

Do not replace the architecture because another architecture is theoretically cleaner. This is a 12-hour delivery.

---

# TASK
Replace this line with the specific task you are assigned:

`[TASK HERE]`

---

# Execution protocol

### Step 1 — Inspect
Before editing:
- inspect the repository structure
- locate the relevant existing files
- identify dependencies already installed
- identify the API/schema contract you must preserve

### Step 2 — Plan
State internally or in your agent response:
- files to create/change
- dependencies needed
- tests to add/update
- integration points

### Step 3 — Implement
Implement the **smallest production-shaped solution** that satisfies the task.

### Step 4 — Test
Run the most relevant tests immediately. Do not wait until the end of the hackathon to test your work.

### Step 5 — Log checkpoint
Append to `docs/PROCESS_LOG.md` using the exact format below.

### Step 6 — Handoff
Return:
1. what changed
2. files changed
3. tests run/results
4. blockers/deviations
5. exact next step for the teammate

---

# ML rules
- Use chronological train/validation splits for forecasting.
- Never randomly shuffle time-series rows for evaluation.
- Explicitly check for leakage.
- Benchmark an ML model against a simple baseline.
- Prefer MAE when MAPE is unstable because of zeros/near-zero values.
- Use transparent scoring formulas for credit readiness.
- Keep credit weights explicit and testable.

### Forecast recommendation
Use daily net cash flow per SME.

Features:
- lag 1
- lag 7
- lag 14
- lag 28
- rolling mean/std 7, 14, 30 days
- day-of-week
- day-of-month
- month
- end-of-month flag

Candidate model:
- `HistGradientBoostingRegressor`

Baseline:
- seasonal naive / rolling mean

Use the simpler baseline in the demo if it performs as well as or better than the ML model.

### Credit-readiness prototype weights
- cash-flow stability: 25%
- revenue consistency: 20%
- growth trend: 20%
- repayment behaviour: 20%
- forecast liquidity: 15%

Score range must be **0–100**.

### Loan simulation rule
The simulator is decision support only. Larger projected repayments should not improve projected liquidity under otherwise identical conditions.

---

# API contract that agents must preserve

- `GET /api/v1/portfolio/summary`
- `GET /api/v1/smes`
- `GET /api/v1/smes/{id}`
- `GET /api/v1/smes/{id}/health`
- `GET /api/v1/smes/{id}/cashflow`
- `GET /api/v1/smes/{id}/forecast?horizon=90`
- `GET /api/v1/smes/{id}/credit-readiness`
- `GET /api/v1/smes/{id}/accounts`
- `POST /api/v1/smes/{id}/loan-simulation`
- `GET /healthz`
- `GET /readyz`

Freeze the contract after Hour 1 unless there is a genuine defect.

---

# Process log — mandatory

After every meaningful checkpoint, append:

```md
### [YYYY-MM-DD HH:MM] [ROLE] [TASK-ID]
Status: DONE | PARTIAL | BLOCKED
Goal:
Changes:
Files changed:
Tests run:
Test result:
Decisions:
Blockers:
Next checkpoint:
Time remaining:
```

Also record:
- deviations from the PRD
- dependencies added/removed
- API/schema changes
- known bugs intentionally deferred

## Required checkpoints
- A. Task understood and repository inspected
- B. Implementation skeleton complete
- C. Local tests pass
- D. Integration complete
- E. Final smoke test complete

---

# Definition of done
A task is DONE only when:
- implementation exists
- relevant tests exist and pass
- no unrelated feature is broken
- process log is updated
- another teammate can continue without needing a verbal explanation

---

# Task-specific prompt snippets

## Backend / API
`TASK-ID: BACKEND-API`

Implement the FastAPI backend for the frozen SME Financial Intelligence API contract. Build SQLAlchemy models, Pydantic schemas, database session management, seed loading, portfolio/SME/health/cash-flow/forecast/credit/simulation routes, `/healthz` and `/readyz`. Add pytest + httpx coverage for all P0 routes. Keep Open Banking as an adapter interface with a synthetic implementation. Do not build live bank connectivity.

## ML / Forecast
`TASK-ID: ML-FORECAST`

Implement financial analytics and forecasting services. Compute cash-flow stability, growth, liquidity and expense metrics. Build a simple baseline and a scikit-learn forecasting model with lag/rolling/calendar features. Use chronological evaluation and MAE. Expose a clean service interface for 30/60/90-day forecasts. Add tests for leakage, horizon length and edge cases.

## Credit scoring
`TASK-ID: ML-CREDIT`

Implement the 0–100 prototype credit-readiness score using the frozen weights. Add component scores, reasons and tests for score bounds, weight sum and expected monotonic behaviour. Clearly label it as prototype decision support.

## Frontend
`TASK-ID: FRONTEND-DASHBOARD`

Build the React/TypeScript dashboard against the frozen API contract. Implement portfolio, SME detail, financial health, cash-flow chart, forecast chart, credit readiness, connected accounts/consent simulation, and loan simulator. Use reusable components and proper loading/error/empty states.

## Open Banking mock adapter
`TASK-ID: OPEN-BANKING-MOCK`

Define a common account/transaction interface and implement a synthetic provider that returns Wema and customer-authorised external accounts with consent metadata, timestamps and expiry. Make it obvious which data is internal vs authorised external data. Do not call real bank APIs.

## QA
`TASK-ID: QA`

Review the full repo against the PRD and test plan. Run backend tests, frontend tests and the critical smoke flow. Add missing tests for calculations, forecasting, credit scoring, simulation, API contracts, errors, CORS and deployment health. Look specifically for time-series leakage, score violations, inconsistent units, NaN/None propagation and broken UI states.

## Deployment
`TASK-ID: DEPLOY`

Prepare Vercel + Render + Render PostgreSQL deployment. Verify environment configuration, CORS, production start command, health/readiness endpoints, migration/seed strategy, frontend API base URL and `render.yaml`. Do not commit secrets. After deployment, run the public smoke test: portfolio → SME → forecast → credit → simulator.
