"""SME-scoped read routes: list, profile, health, cash flow, forecast, credit."""
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import Principal, get_principal, require_officer, scope_to_own_sme
from ..database import get_db
from ..deps import f, load_sme_or_404
from ..models import SME as SMEModel
from ..schemas import (
    CashflowSeries,
    CreditReadiness,
    Forecast,
    HealthMetrics,
    SME,
)
from ..services import analytics, cashflow as cashflow_service, credit as credit_service
from ..services import forecast as forecast_service
from ..services.ml import ALLOWED_HORIZONS

router = APIRouter(prefix="/api/v1", tags=["smes"])


@router.get("/smes", response_model=list[SME])
def list_smes(
    _principal: Principal = Depends(require_officer),
    db: Session = Depends(get_db),
) -> list[SMEModel]:
    return list(db.execute(select(SMEModel).order_by(SMEModel.id)).scalars().all())


@router.get("/smes/{sme_id}", response_model=SME)
def get_sme(
    sme_id: str,
    principal: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
) -> SMEModel:
    scope_to_own_sme(sme_id, principal)
    return load_sme_or_404(db, sme_id)


@router.get("/smes/{sme_id}/health", response_model=HealthMetrics)
def get_health(
    sme_id: str,
    principal: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
) -> dict:
    scope_to_own_sme(sme_id, principal)
    load_sme_or_404(db, sme_id)
    return analytics.compute_health(db, sme_id)


@router.get("/smes/{sme_id}/cashflow", response_model=CashflowSeries)
def get_cashflow(
    sme_id: str,
    date_from: date | None = Query(default=None, alias="from"),
    date_to: date | None = Query(default=None, alias="to"),
    principal: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
) -> dict:
    scope_to_own_sme(sme_id, principal)
    load_sme_or_404(db, sme_id)

    daily, sources = cashflow_service.load_daily_frame(
        db, sme_id, date_from=date_from, date_to=date_to
    )
    points = [
        {
            "date": row.date,
            "inflow": f(row.inflow),
            "outflow": f(row.outflow),
            "net": f(row.net),
        }
        for row in daily.itertuples(index=False)
    ]
    return {
        "sme_id": sme_id,
        "grain": "daily",
        "points": points,
        "data_sources": sources,
    }


@router.get("/smes/{sme_id}/forecast", response_model=Forecast)
def get_forecast(
    sme_id: str,
    horizon: int = Query(default=90, description="One of 30, 60, 90"),
    principal: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
) -> dict:
    scope_to_own_sme(sme_id, principal)
    load_sme_or_404(db, sme_id)
    if horizon not in ALLOWED_HORIZONS:
        raise _unprocessable(f"horizon must be one of {list(ALLOWED_HORIZONS)}")
    return forecast_service.build_forecast(db, sme_id, horizon)


@router.get("/smes/{sme_id}/credit-readiness", response_model=CreditReadiness)
def get_credit_readiness(
    sme_id: str,
    principal: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
) -> dict:
    scope_to_own_sme(sme_id, principal)
    load_sme_or_404(db, sme_id)
    return credit_service.build_credit_readiness(db, sme_id)


def _unprocessable(message: str):
    from fastapi import HTTPException

    return HTTPException(status_code=422, detail=message)
