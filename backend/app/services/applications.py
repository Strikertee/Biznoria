"""Loan application service.

Implements the first act of the PRD consent lifecycle — *"SME applies for a
facility"* — and the officer's review terminal state.

Decision-support only (PRD rule 3): the officer records a **recommendation** for
human credit review. There is no approve/decline state anywhere in this module,
and ``Recommendation`` has no such member.
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models import ApplicationStatus, LoanApplication, Recommendation, SME
from .ml import LOAN_DISCLAIMER, amortized_monthly_payment

STATUS_LABELS: dict[str, str] = {
    ApplicationStatus.SUBMITTED.value: "Submitted",
    ApplicationStatus.UNDER_REVIEW.value: "Under review",
    ApplicationStatus.RECOMMENDATION_RECORDED.value: "Recommendation recorded",
}

RECOMMENDATION_LABELS: dict[str, str] = {
    Recommendation.RECOMMEND_FOR_REVIEW.value: "Recommend for credit review",
    Recommendation.REQUEST_MORE_INFORMATION.value: "Request more information",
    Recommendation.FLAG_FOR_MONITORING.value: "Flag for monitoring",
}

_OPEN_STATUSES = (ApplicationStatus.SUBMITTED.value, ApplicationStatus.UNDER_REVIEW.value)


def _next_id(db: Session) -> str:
    last = db.execute(select(func.max(LoanApplication.id))).scalar_one_or_none()
    n = 0
    if last:
        try:
            n = int(str(last).split("-")[-1])
        except ValueError:
            n = 0
    return f"APP-{n + 1:04d}"


def _to_out(row: LoanApplication, sme_name: str) -> dict:
    return {
        "id": row.id,
        "sme_id": row.sme_id,
        "sme_name": sme_name,
        "amount": round(float(row.amount), 2),
        "annual_rate": float(row.annual_rate),
        "term_months": int(row.term_months),
        "purpose": row.purpose,
        "monthly_repayment": amortized_monthly_payment(
            float(row.amount), float(row.annual_rate), int(row.term_months)
        ),
        "status": row.status,
        "status_label": STATUS_LABELS.get(row.status, row.status),
        "submitted_at": row.submitted_at,
        "recommendation": row.recommendation,
        "recommendation_label": (
            RECOMMENDATION_LABELS.get(row.recommendation) if row.recommendation else None
        ),
        "recommendation_note": row.recommendation_note,
        "recommendation_at": row.recommendation_at,
        "reviewed_by": row.reviewed_by,
        "disclaimer": LOAN_DISCLAIMER,
    }


def _select_rows(db: Session, sme_id: str | None):
    stmt = select(LoanApplication, SME.name).join(SME, LoanApplication.sme_id == SME.id)
    if sme_id is not None:
        stmt = stmt.where(LoanApplication.sme_id == sme_id)
    return db.execute(
        stmt.order_by(LoanApplication.submitted_at.desc(), LoanApplication.id.desc())
    ).all()


def create_application(
    db: Session,
    sme_id: str,
    amount: float,
    annual_rate: float,
    term_months: int,
    purpose: str,
) -> dict:
    """SME submits a facility request. Consent is enforced at the route layer."""
    sme = db.get(SME, sme_id)
    if sme is None:
        raise LookupError("SME not found")

    row = LoanApplication(
        id=_next_id(db),
        sme_id=sme_id,
        amount=float(amount),
        annual_rate=float(annual_rate),
        term_months=int(term_months),
        purpose=(purpose or "").strip(),
        status=ApplicationStatus.SUBMITTED.value,
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_out(row, sme.name)


def list_applications(db: Session, sme_id: str | None = None) -> list[dict]:
    return [_to_out(row, name) for row, name in _select_rows(db, sme_id)]


def get_application(db: Session, app_id: str) -> dict | None:
    found = db.execute(
        select(LoanApplication, SME.name)
        .join(SME, LoanApplication.sme_id == SME.id)
        .where(LoanApplication.id == app_id)
    ).first()
    if found is None:
        return None
    row, name = found
    return _to_out(row, name)


def record_recommendation(
    db: Session,
    app_id: str,
    recommendation: str,
    note: str,
    reviewed_by: str,
) -> dict | None:
    """Officer records a decision-support recommendation. Never an approval."""
    if recommendation not in RECOMMENDATION_LABELS:
        raise ValueError(f"unknown recommendation: {recommendation!r}")

    found = db.execute(
        select(LoanApplication, SME.name)
        .join(SME, LoanApplication.sme_id == SME.id)
        .where(LoanApplication.id == app_id)
    ).first()
    if found is None:
        return None
    row, name = found

    row.recommendation = recommendation
    row.recommendation_note = (note or "").strip() or None
    row.recommendation_at = datetime.now(timezone.utc)
    row.reviewed_by = reviewed_by
    row.status = ApplicationStatus.RECOMMENDATION_RECORDED.value
    db.commit()
    db.refresh(row)
    return _to_out(row, name)


def open_count(db: Session, sme_id: str | None = None) -> int:
    stmt = select(func.count()).select_from(LoanApplication).where(
        LoanApplication.status.in_(_OPEN_STATUSES)
    )
    if sme_id is not None:
        stmt = stmt.where(LoanApplication.sme_id == sme_id)
    return int(db.execute(stmt).scalar_one())
