"""Frozen API entrypoint — route paths match docs/API_CONTRACT.md.

Startup (lifespan):
  1. ensure schema exists (``Base.metadata.create_all`` — no-op if Alembic ran)
  2. seed the deterministic synthetic dataset when the DB is empty
  3. hydrate the Open Banking consent/token store from the DB

Run locally:
    uvicorn app.main:app --reload --app-dir backend
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select, text

from .config import APP_ENV, FRONTEND_ORIGINS, seed_on_startup
from .database import Base, SessionLocal, engine
from .models import SME
from .routers import accounts_router, portfolio_router, simulation_router, smes_router
from .schemas import HealthzResponse, ReadyzResponse
from .seed import seed_database
from .services import consent as consent_service


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    if seed_on_startup():
        with SessionLocal() as db:
            result = seed_database(db)
            consent_service.hydrate_provider(db)
            if result.get("seeded"):
                print(
                    f"[seed] {result['smes']} SMEs, {result['accounts']} accounts, "
                    f"{result['transactions']} transactions (anchor {result['anchor_date']})"
                )
    yield


app = FastAPI(
    title="Biznoria SME Financial Intelligence (prototype)",
    description=(
        "Hackathon prototype — synthetic data only. Decision support, not "
        "underwriting. No live bank connectivity."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(portfolio_router)
app.include_router(smes_router)
app.include_router(accounts_router)
app.include_router(simulation_router)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError):
    """Contract: errors are ``{"detail": str}`` (not FastAPI's default list)."""
    first = exc.errors()[0] if exc.errors() else {}
    loc = ".".join(str(p) for p in first.get("loc", ()) if p not in ("body", "query"))
    msg = first.get("msg", "invalid request")
    detail = f"{loc}: {msg}" if loc else msg
    return JSONResponse(status_code=422, content={"detail": detail})


@app.get("/healthz", response_model=HealthzResponse, tags=["ops"])
def healthz() -> dict:
    return {"status": "ok"}


@app.get("/readyz", response_model=ReadyzResponse, tags=["ops"])
def readyz() -> dict:
    checks = {"db": False, "seed": False}
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
            checks["db"] = True
            checks["seed"] = (
                db.execute(select(SME.id).limit(1)).scalar_one_or_none() is not None
            )
    except Exception:  # noqa: BLE001 — readiness must never raise
        pass
    return {"ready": all(checks.values()), "checks": checks}


__all__ = ["app", "APP_ENV"]
