"""Loan application routes.

Additive to the frozen contract — see docs/DECISIONS.md CR-004.

    POST /api/v1/smes/{id}/loan-applications        SME applies (own business)
    GET  /api/v1/smes/{id}/loan-applications        that SME's applications
    GET  /api/v1/loan-applications                  officer queue
    GET  /api/v1/loan-applications/{app_id}         one application
    POST /api/v1/loan-applications/{app_id}/recommendation
                                                    officer records a recommendation

Decision support only: the recommendation endpoint cannot express approval or
decline (see ``models.Recommendation``).
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import Principal, get_principal, require_officer, scope_to_own_sme
from ..database import get_db
from ..deps import load_sme_or_404
from ..schemas import LoanApplication, LoanApplicationCreate, RecommendationRequest
from ..services import applications as applications_service

router = APIRouter(prefix="/api/v1", tags=["applications"])


@router.post(
    "/smes/{sme_id}/loan-applications",
    response_model=LoanApplication,
    status_code=201,
)
def submit_application(
    sme_id: str,
    body: LoanApplicationCreate,
    principal: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
) -> dict:
    scope_to_own_sme(sme_id, principal)
    load_sme_or_404(db, sme_id)
    if not body.consent:
        # The request is the trigger for the read-only data-sharing prompt.
        raise HTTPException(
            status_code=422,
            detail="consent is required to submit a facility request",
        )
    return applications_service.create_application(
        db,
        sme_id=sme_id,
        amount=body.amount,
        annual_rate=body.annual_rate,
        term_months=body.term_months,
        purpose=body.purpose,
    )


@router.get("/smes/{sme_id}/loan-applications", response_model=list[LoanApplication])
def list_applications_for_sme(
    sme_id: str,
    principal: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
) -> list[dict]:
    scope_to_own_sme(sme_id, principal)
    load_sme_or_404(db, sme_id)
    return applications_service.list_applications(db, sme_id)


@router.get("/loan-applications", response_model=list[LoanApplication])
def list_all_applications(
    _principal: Principal = Depends(require_officer),
    db: Session = Depends(get_db),
) -> list[dict]:
    return applications_service.list_applications(db)


@router.get("/loan-applications/{app_id}", response_model=LoanApplication)
def get_application(
    app_id: str,
    principal: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
) -> dict:
    found = applications_service.get_application(db, app_id)
    if found is None:
        raise HTTPException(status_code=404, detail="Application not found")
    scope_to_own_sme(found["sme_id"], principal)
    return found


@router.post("/loan-applications/{app_id}/recommendation", response_model=LoanApplication)
def record_recommendation(
    app_id: str,
    body: RecommendationRequest,
    principal: Principal = Depends(require_officer),
    db: Session = Depends(get_db),
) -> dict:
    try:
        result = applications_service.record_recommendation(
            db,
            app_id=app_id,
            recommendation=body.recommendation,
            note=body.note,
            reviewed_by=principal.role,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if result is None:
        raise HTTPException(status_code=404, detail="Application not found")
    return result
