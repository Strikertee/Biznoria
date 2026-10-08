"""Cash-flow service: DB transactions → continuous daily net-flow frame.

The single place where the ``CREDIT``/``DEBIT`` convention (PRD §8.2) is mapped
onto the ML package's ``inflow``/``outflow`` convention. External rows are
filtered here, once, so every downstream metric inherits the consent gate.
"""
from __future__ import annotations

from datetime import date, datetime

import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Account, Transaction, TxSource
from . import consent as consent_service
from .ml import to_daily_net_flow

_EMPTY_COLUMNS = ["date", "inflow", "outflow", "net"]


def _load_rows(
    db: Session,
    sme_id: str,
    *,
    include_external: bool,
    date_from: date | None,
    date_to: date | None,
    now: datetime | None,
) -> list[Transaction]:
    stmt = select(Transaction).where(Transaction.sme_id == sme_id)
    if date_from is not None:
        stmt = stmt.where(Transaction.date >= date_from)
    if date_to is not None:
        stmt = stmt.where(Transaction.date <= date_to)
    rows = list(db.execute(stmt.order_by(Transaction.date)).scalars().all())

    allowed_external: set[str] = set()
    if include_external:
        allowed_external = consent_service.authorised_external_account_ids(db, sme_id, now)
    return [
        r
        for r in rows
        if r.source != TxSource.EXTERNAL.value or r.account_id in allowed_external
    ]


def sources_present(rows: list[Transaction]) -> list[str]:
    """Distinct data sources actually used, Wema first (PRD §5.3 attribution)."""
    seen = {r.source for r in rows}
    ordered = [s for s in (TxSource.WEMA.value, TxSource.EXTERNAL.value) if s in seen]
    return ordered or [TxSource.WEMA.value]


def load_daily_frame(
    db: Session,
    sme_id: str,
    *,
    include_external: bool = True,
    date_from: date | None = None,
    date_to: date | None = None,
    now: datetime | None = None,
) -> tuple[pd.DataFrame, list[str]]:
    """Return ``(daily_frame, data_sources)`` for one SME.

    The frame always has ``date, inflow, outflow, net`` columns with no date
    gaps (zeros filled) — exactly what ``biznoria_ml`` expects.
    """
    rows = _load_rows(
        db,
        sme_id,
        include_external=include_external,
        date_from=date_from,
        date_to=date_to,
        now=now,
    )
    if not rows:
        return pd.DataFrame(columns=_EMPTY_COLUMNS), [TxSource.WEMA.value]

    raw = pd.DataFrame(
        {
            "date": [r.date for r in rows],
            "amount": [float(r.amount) for r in rows],
            "direction": ["inflow" if r.direction == "CREDIT" else "outflow" for r in rows],
        }
    )
    daily = to_daily_net_flow(raw)
    return daily, sources_present(rows)


def latest_transaction_date(db: Session, sme_id: str) -> date | None:
    row = db.execute(
        select(Transaction.date)
        .where(Transaction.sme_id == sme_id)
        .order_by(Transaction.date.desc())
        .limit(1)
    ).scalar_one_or_none()
    return row


def wema_account_id(db: Session, sme_id: str) -> str | None:
    return db.execute(
        select(Account.id)
        .where(Account.sme_id == sme_id, Account.source == "internal")
        .order_by(Account.id)
        .limit(1)
    ).scalar_one_or_none()
