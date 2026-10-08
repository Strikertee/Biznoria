"""Frozen API entrypoint — route paths must match docs/API_CONTRACT.md.

TODO(BACKEND-API): wire DB session, seed loader, ml services, adapter.
Stubs below return 501 so contract tests can assert paths exist without
claiming functionality.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Biznoria SME Financial Intelligence (prototype)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO(DEPLOY): restrict to FRONTEND_ORIGIN
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


@app.get("/readyz")
def readyz():
    # TODO(BACKEND-API): check DB + seed loaded
    return {"ready": False, "checks": {"db": False, "seed": False}}


# TODO(BACKEND-API): include routers with the EXACT frozen prefixes:
#   /api/v1/portfolio/summary, /api/v1/smes, /api/v1/smes/{id},
#   /api/v1/smes/{id}/health, /cashflow, /forecast?horizon=,
#   /credit-readiness, /accounts, POST /loan-simulation
# See backend/app/routers/ stubs.
