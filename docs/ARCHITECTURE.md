# Architecture (frozen for 10h delivery)

```
┌──────────────┐      HTTPS/JSON       ┌──────────────────┐     SQLAlchemy 2.x    ┌────────────┐
│  Frontend    │ ───────────────────▶ │  FastAPI backend │ ───────────────────▶ │ PostgreSQL │
│ React+TS     │ ◀─────────────────── │  /api/v1/...     │ ◀─────────────────── │ (Render)   │
│ Vite/Tailwind│                      │  Pydantic v2     │                      └────────────┘
│ Recharts     │                      │  services → ml   │
│ TanStack Qry │                      └────────┬─────────┘
└──────────────┘                               │ imports (no HTTP)
                                      ┌────────▼─────────┐      ┌────────────────────┐
                                      │ ml (biznoria_ml) │      │ Open Banking mock  │
                                      │ features/metrics │      │ adapter interface  │
                                      │ forecast/credit  │      │ + synthetic impl   │
                                      │ simulation       │      │ consent metadata   │
                                      └──────────────────┘      └────────────────────┘
```

## Repos / folders
- `frontend/` — React+TS+Vite+Tailwind+Recharts+TanStack Query. API client in
  `src/api/client.ts` mirrors `docs/API_CONTRACT.md`. No business logic drift.
- `backend/app/` — FastAPI routes (`routers/`), SQLAlchemy models, Pydantic schemas,
  DB session, seed loader, `adapters/openbanking.py` (ABC + synthetic provider).
  Routes are thin: validate → service → schema. ML lives in `ml/`, imported as a
  package (backend `requirements.txt` includes `../ml` path note / duplicated pins).
- `ml/src/biznoria_ml/` — pure-python analytics: `features.py`, `metrics.py`,
  `forecast.py`, `credit.py`, `simulation.py`. pandas/NumPy/scikit-learn only
  (+ optional statsmodels, not required). No FastAPI/SQLAlchemy imports here.
- `data/` — synthetic only (gitignored artefacts; committed `sample/` tiny).
- `scripts/generate_synthetic.py` — deterministic generator (seeded RNG).

## Data model (logical)
- `smes(id, name, sector, size_band, joined_on, region)`
- `transactions(id, sme_id, date, amount, direction[inflow|outflow], category, channel, source[wema|external], account_id)`
- `accounts(id, sme_id, provider[wema|external_mock], label, consent_id NULLABLE, consent_expires_at NULLABLE)`
- `consents(id, sme_id, provider, scopes, granted_at, expires_at, revoked_at NULLABLE)`
- External rows are only served when a valid, unexpired, unrevoked consent exists.
  The `source` field always distinguishes internal vs authorised-external data.

## Consent lifecycle (ALAT for Business → mock adapter)
1. SME applies for a facility inside the ALAT for Business app.
2. A secure consent prompt appears, stating exactly what is shared (read-only
   account/transaction access), with whom, and for how long (limited window).
3. On customer approval the adapter issues a scoped **read-only access token**
   (`AccessToken`: token string, consent id, scopes, issued_at, expires_at).
   Scopes never include write/payment initiation in this prototype.
4. Every external-data call presents the token; the adapter validates
   signature/expiry/revocation before serving any row.
5. The customer can revoke consent (and hence the token) at any time; revocation
   takes effect immediately — subsequent external calls return no rows.
6. Expiry is automatic: an expired token is rejected without a backend change.
See `backend/app/adapters/openbanking.py` (interface + synthetic implementation).

## Roles → surface matrix (additive; contract unchanged)
| Capability | SME customer | Account officer |
|---|---|---|
| Own cash-flow, health, forecast, credit readiness | ✅ (own `sme_id` only) | ✅ (any SME) |
| Portfolio summary, SME list | ❌ | ✅ |
| Connected accounts (internal + consented-external) | ✅ own only | ✅ per SME |
| Loan what-if simulator | ❌ | ✅ |
| Combined officer tasks | ❌ | ✅ (P1) |
Enforcement point: backend (`backend/app/auth.py` role guard + `sme_id`
scoping); frontend renders per role but never enforces. Both roles inherit the
consent/token gating above for external data.

## Request flow (example: forecast)
`GET /api/v1/smes/{id}/forecast?horizon=90` → router validates `horizon ∈ {30,60,90}`
→ loads daily net flow (internal + consented external) → `biznoria_ml.forecast_future`
→ returns `{ horizon, history_len, model_used, mae_val, points[{date, yhat}] }`.

## Constraints honoured
- No live bank SDKs. Adapter interface only (`backend/app/adapters/openbanking.py`).
- ML has no I/O, no network, no DB — pure functions of DataFrames/inputs.
- Contract freeze: `docs/API_CONTRACT.md` is authoritative; backend + frontend +
  tests assert against it.
