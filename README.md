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

## Quickstart (backend, stub)
```bash
pip install -r backend/requirements.txt
uvicorn app.main:app --reload --app-dir backend
```

## Quickstart (frontend, stub)
```bash
cd frontend && npm install && npm run dev
```

## Contract
Frozen: `docs/API_CONTRACT.md`. Change only for genuine defects.
