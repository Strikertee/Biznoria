# Biznoria — project conventions

SME Financial Intelligence Platform · Wema Bank Hackaholics · 3-person team
(backend / frontend / ML). Repo: github.com/Strikertee/Biznoria.

## Source of truth order
`docs/PRD.md` (+ the .docx/.pdf "Unified PRD") → `docs/API_CONTRACT.md` (FROZEN) →
`docs/ARCHITECTURE.md` → `docs/TEST_PLAN.md` → `docs/PROCESS_LOG.md` (mandatory
checkpoint per task) → `docs/DECISIONS.md` (change requests). The OpenCode master
prompt in `docs/` defines the task ids: BACKEND-API, ML-FORECAST, ML-CREDIT,
FRONTEND-DASHBOARD, OPEN-BANKING-MOCK, QA, DEPLOY.

## Non-negotiables
- Synthetic data only. No real credentials, no real bank data, no secrets in git.
- Open Banking is consent-based; no consent → no external rows, ever.
- Credit readiness is decision support, never approval/decline language. Disclaimer
  strings must be verbatim.
- P0 beats P1/P2. Simple/deterministic beats clever. No new frameworks.
- Never overwrite another lane's work — file a CR in `docs/DECISIONS.md` instead.
- Frontend must not reimplement backend formulas.

## Locked stack
React+TS+Vite+Tailwind+Recharts+TanStack Query · FastAPI+Pydantic v2+SQLAlchemy 2.x+
Alembic · Postgres (Render) · pandas/NumPy/scikit-learn · pytest/httpx · Vercel + Render.

## Conventions that bit us
- Money is NGN floats. `direction` is `CREDIT|DEBIT` (PRD §8.2); map to
  inflow/outflow only at the ML boundary.
- Scores 0–100. `health_status = healthy|watch|risk`;
  `forecast_status = healthy|watch|high_pressure`;
  `consent_status = active|expired|revoked|not_connected`.
- Errors are `{"detail": str}` — there is a custom RequestValidationError handler.
- Unknown `sme_id` → 404 `{"detail": "SME not found"}`; bad horizon → 422.
- Additive response fields are allowed (CR-002); renaming/removing a frozen field is not.
- `backend/__init__.py` exists only so `backend.tests.*` doesn't collide with
  `ml/tests` (also a package named `tests`). Do not delete it.
- `.gitignore` must keep the `data/` rules — the local DB and CSV cache are generated
  artefacts. Check `git status data/` after any `.gitignore` edit.

## Local dev
Isolated venv: `C:/Users/IFEANYI/.workbuddy-ai/binaries/python/envs/biznoria`.
`<venv>/Scripts/python.exe -m pytest -q` from the repo root runs both lanes (84 tests).
`uvicorn app.main:app --reload --app-dir backend` — note `--app-dir backend`, not
`backend/app`. First startup seeds ~37k transactions; later startups are a no-op.

## Open item
CR-001: `biznoria_ml.metrics.growth_trend` is insensitive (10x growth scores the same
as flat). ML-lane fix proposed in `docs/DECISIONS.md`; backend works around it.
