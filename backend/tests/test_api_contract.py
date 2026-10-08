"""P0 API contract tests (owner: BACKEND-API + QA lanes).

These assert the FROZEN contract in docs/API_CONTRACT.md against the backend.
Skeleton only — implemented when the backend routes land. Must cover:
portfolio/summary, smes CRUD-read, health, cashflow, forecast horizons + 422,
credit-readiness (bounds/disclaimer), accounts consent gating, loan-simulation
invariant, /healthz + /readyz, CORS.
"""
# TODO(BACKEND-API): implement with httpx AsyncClient + pytest-asyncio.
