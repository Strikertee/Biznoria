# Biznoria — SME Financial Intelligence Platform (hackathon prototype)

Synthetic-data-only AI platform: financial health, cash-flow intelligence,
30/60/90-day forecasts, prototype credit readiness (decision support — **not**
underwriting, never approval/decline), loan what-if simulation, and a
consent-based mock Open Banking adapter. No live bank integration.

## Layout
- `docs/` — PRD, architecture, **frozen API contract**, test plan, process log.
- `backend/` — FastAPI (owner: BACKEND-API lane). Thin routes over `ml` + adapter.
- `ml/` — analytics/forecast/credit (owner: ML lane — **implemented**).
- `frontend/` — React+TS dashboard (owner: FRONTEND lane).
- `scripts/generate_synthetic.py` — deterministic synthetic data generator.
- `data/` — gitignored artefacts + tiny committed `sample/`.

## Quickstart (ML)
```bash
pip install -r ml/requirements.txt
pytest ml/tests -q
```

## Quickstart (backend — implemented)
```bash
pip install -r backend/requirements.txt
alembic upgrade head                        # optional; startup also creates the schema
uvicorn app.main:app --reload --app-dir backend
```
First startup generates the deterministic synthetic dataset and seeds it
(~37k transactions, a few seconds); later startups are a no-op. Swagger at
`/docs`, readiness at `/readyz`.

Demo entry point: `GET /api/v1/smes/ADE_FASHION_001` — "Ade's Fashion Store" is
the canonical PRD §9 fixture. The API defaults to the **officer** role; pass
`X-Role: sme` + `X-SME-Id: <id>` for the customer surface.

## Quickstart (frontend, stub)
```bash
cd frontend && npm install && npm run dev
```

## Contract
Frozen: `docs/API_CONTRACT.md`. Change only for genuine defects.
Change requests and open items: `docs/DECISIONS.md`.
