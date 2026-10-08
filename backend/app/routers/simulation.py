"""Loan what-if simulator — officer-only, decision support only (PRD §5.6, §12)."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import Principal, require_officer
from ..database import get_db
from ..deps import load_sme_or_404
from ..schemas import LoanSimRequest, LoanSimResult
from ..services import simulation as simulation_service

router = APIRouter(prefix="/api/v1", tags=["simulation"])


@router.post("/smes/{sme_id}/loan-simulation", response_model=LoanSimResult)
def run_simulation(
    sme_id: str,
    body: LoanSimRequest,
    _principal: Principal = Depends(require_officer),
    db: Session = Depends(get_db),
) -> dict:
    load_sme_or_404(db, sme_id)
    return simulation_service.build_simulation(
        db, sme_id, body.amount, body.annual_rate, body.term_months
    )
