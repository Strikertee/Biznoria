# Backend (owner: BACKEND-API lane — IMPLEMENTED)

FastAPI + Pydantic v2 + SQLAlchemy 2.x + Alembic. Implements the frozen contract in
`docs/API_CONTRACT.md`. Routes are thin: validate → load daily flows (internal +
consented external) → call `biznoria_ml` → respond with Pydantic schemas.

## Run it

```bash
# from the repository root
pip install -r backend/requirements.txt

# optional: build the schema with Alembic (create_all also does this at startup)
alembic upgrade head

uvicorn app.main:app --reload --app-dir backend
```

Open <http://127.0.0.1:8000/docs> for Swagger. First startup generates the
synthetic dataset and seeds ~37k transactions (a few seconds); later startups
are a no-op.

```bash
curl http://127.0.0.1:8000/readyz
curl http://127.0.0.1:8000/api/v1/portfolio/summary
curl "http://127.0.0.1:8000/api/v1/smes/ADE_FASHION_001/forecast?horizon=90"
```

## Test it

```bash
python -m pytest backend/tests -q     # 59 tests
python -m pytest ml/tests -q          # 25 tests (ML lane, untouched)
```

Tests force their own throwaway SQLite DB and a 12-SME/150-day synthetic cache,
so they never touch `data/biznoria.db`.

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | SQLite at `data/biznoria.db` | Postgres URL on Render |
| `FRONTEND_ORIGIN` | `*` | Comma-separated allowed CORS origins |
| `APP_ENV` | `development` | Informational |
| `SEED_ON_STARTUP` | `1` | Set `0` to skip seeding |
| `SEED_SMES` / `SEED_DAYS` / `SEED_SEED` | `50` / `365` / `42` | Synthetic dataset size |
| `SYNTHETIC_DIR` | `data/synthetic` | Where generated CSVs are cached |

## Layout

```
backend/app/
  config.py       env-driven settings
  database.py     engine, SessionLocal, Base, get_db
  models.py       SME, Account, Transaction, Consent
  schemas.py      Pydantic v2 (frozen fields verbatim + additive P0 fields)
  auth.py         is_allowed() + Principal/require_officer/scope_to_own_sme
  deps.py         load_sme_or_404, finite-float helper
  seed.py         deterministic loader + PRD §9 fixture overlay
  main.py         app, CORS, lifespan, /healthz, /readyz
  services/       ml bridge, consent, cashflow, analytics, forecast, credit,
                  simulation, portfolio
  routers/        portfolio, smes, accounts, simulation
  adapters/       openbanking.py (interface + synthetic provider)
backend/alembic/  env.py + versions/ (initial schema)
```

## Demo fixtures (PRD §9, deterministic — `SEED_SEED=42`)

| SME id | Story | Consent |
|---|---|---|
| `ADE_FASHION_001` — Ade's Fashion Store | healthy, growing | active (external data unified) |
| `TOLA_PHARMACY_002` — Tola Pharmacy | healthy, very stable | active |
| `LAGOS_BISTRO_003` — Lagos Bistro | watch, volatile | expired (no external data) |
| `KANO_ELECTRONICS_004` — Kano Electronics | watch, irregular payments | revoked (no external data) |
| `MART_DECLINE_005` — Marina Mart | risk, declining, forecast high-pressure | none (Wema only) |

## Demo roles

The API defaults to the **officer** role. A customer session is expressed with
headers:

```bash
curl -H "X-Role: sme" -H "X-SME-Id: ADE_FASHION_001" \
     http://127.0.0.1:8000/api/v1/smes/ADE_FASHION_001/health   # 200
curl -H "X-Role: sme" -H "X-SME-Id: ADE_FASHION_001" \
     http://127.0.0.1:8000/api/v1/portfolio/summary             # 403
```

## Notes for teammates

- **Consent gate:** external (non-Wema) rows are filtered in exactly one place,
  `services/cashflow.py::_load_rows`. Anything reading cash flow inherits it.
- **Open items:** CR-001 (ML `growth_trend` insensitive) in `docs/DECISIONS.md`
  is the one defect affecting the credit narrative. CR-002/CR-003 document the
  additive response fields and the accounts consent-state behaviour.
- **Adding a column:** add it to `models.py`, then
  `alembic revision --autogenerate -m "..."` from the repository root.
