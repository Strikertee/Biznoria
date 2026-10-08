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

## Request flow (example: forecast)
`GET /api/v1/smes/{id}/forecast?horizon=90` → router validates `horizon ∈ {30,60,90}`
→ loads daily net flow (internal + consented external) → `biznoria_ml.forecast_future`
→ returns `{ horizon, history_len, model_used, mae_val, points[{date, yhat}] }`.

## Constraints honoured
- No live bank SDKs. Adapter interface only (`backend/app/adapters/openbanking.py`).
- ML has no I/O, no network, no DB — pure functions of DataFrames/inputs.
- Contract freeze: `docs/API_CONTRACT.md` is authoritative; backend + frontend +
  tests assert against it.
