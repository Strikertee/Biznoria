"""Portfolio headline metrics — officer-only surface (PRD §11)."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import Principal, require_officer
from ..database import get_db
from ..schemas import PortfolioSummary
from ..services import portfolio as portfolio_service

router = APIRouter(prefix="/api/v1/portfolio", tags=["portfolio"])


@router.get("/summary", response_model=PortfolioSummary)
def get_summary(
    _principal: Principal = Depends(require_officer),
    db: Session = Depends(get_db),
) -> dict:
    return portfolio_service.build_summary(db)
