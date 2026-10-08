"""Connected accounts + consent metadata (PRD §5.3).

Consent rules enforced here and in the cash-flow gate:
- an SME with **no consent record** gets its Wema account only — no external rows
- a consent that is expired or revoked still renders (so the UI can show the
  status, PRD §5.3) but contributes **zero** external transaction data
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import Principal, get_principal, scope_to_own_sme
from ..database import get_db
from ..deps import load_sme_or_404
from ..models import Account as AccountModel
from ..models import AccountSource, Consent
from ..schemas import Account
from ..services import consent as consent_service

router = APIRouter(prefix="/api/v1", tags=["accounts"])


@router.get("/smes/{sme_id}/accounts", response_model=list[Account])
def list_accounts(
    sme_id: str,
    principal: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
) -> list[dict]:
    scope_to_own_sme(sme_id, principal)
    load_sme_or_404(db, sme_id)

    rows = list(
        db.execute(
            select(AccountModel)
            .where(AccountModel.sme_id == sme_id)
            .order_by(AccountModel.is_primary.desc(), AccountModel.id)
        )
        .scalars()
        .all()
    )

    out: list[dict] = []
    for acc in rows:
        if acc.source == AccountSource.AUTHORISED_EXTERNAL.value:
            consent_row = db.get(Consent, acc.consent_id) if acc.consent_id else None
            if consent_row is None:
                continue  # no consent on record → no external rows
            status = consent_service.consent_state(consent_row)
        else:
            status = "not_connected"
        out.append(
            {
                "id": acc.id,
                "sme_id": acc.sme_id,
                "provider": acc.provider,
                "label": acc.label,
                "consent_id": acc.consent_id,
                "consent_expires_at": acc.consent_expires_at,
                "source": acc.source,
                "institution_name": acc.institution_name,
                "account_type": acc.account_type,
                "masked_account": acc.masked_account,
                "is_primary": acc.is_primary,
                "consent_status": status,
            }
        )
    return out
