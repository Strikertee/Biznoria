"""Consent service — DB records + provider token store, one consent model.

The DB (``consents`` table) is the source of truth for what the customer
authorised. The ``SyntheticProvider`` is the source of truth for whether a
read-only token is currently valid. This module keeps the two in sync and
exposes the single question the rest of the backend asks:

    "may I serve external (non-Wema) data for this SME right now?"

Rules enforced (PRD non-negotiable #2):
- no consent  → no external rows
- expired     → no external rows
- revoked     → no external rows
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..adapters.openbanking import AccessToken, Consent as AdapterConsent, SyntheticProvider
from ..models import Account, AccountSource, Consent, ConsentStatus

# Process-wide provider instance (in-memory token store, synthetic data only).
_PROVIDER = SyntheticProvider()


def provider() -> SyntheticProvider:
    return _PROVIDER


def iso(dt: datetime) -> str:
    """Format a datetime as a comparable ISO-8601 UTC string.

    The adapter compares timestamps lexicographically, so every string must use
    the exact same layout (``+00:00`` suffix, microsecond precision).
    """
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def hydrate_provider(db: Session) -> None:
    """Rebuild the provider's consent + token store from the DB.

    Called once at startup (after seeding). Consents that are still valid get a
    read-only token minted, exactly as if the customer had just approved the
    in-app prompt.
    """
    p = _PROVIDER
    now_iso = iso(_now())
    for row in db.execute(select(Consent)).scalars().all():
        adapter_consent = AdapterConsent(
            id=row.id,
            sme_id=row.sme_id,
            provider=row.provider,
            scopes=tuple(row.scopes or ()),
            granted_at=iso(row.granted_at),
            expires_at=iso(row.expires_at),
            revoked_at=None if row.revoked_at is None else iso(row.revoked_at),
        )
        p.register_consent(adapter_consent)
        if adapter_consent.is_valid(now_iso) and p.token_for_consent(row.id) is None:
            p.approve_consent(row.id, now_iso)


def consent_state(row: Consent | None, now: datetime | None = None) -> str:
    """Map a consent row to the frozen ``consent_status`` enum."""
    if row is None:
        return ConsentStatus.NOT_CONNECTED.value
    now = now or _now()
    if row.revoked_at is not None:
        return ConsentStatus.REVOKED.value
    if now >= _aware(row.expires_at):
        return ConsentStatus.EXPIRED.value
    return ConsentStatus.ACTIVE.value


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


def consent_for(db: Session, sme_id: str) -> Consent | None:
    """Most recent consent row for an SME (any state)."""
    return (
        db.execute(
            select(Consent)
            .where(Consent.sme_id == sme_id)
            .order_by(Consent.granted_at.desc())
        )
        .scalars()
        .first()
    )


def is_consent_valid(row: Consent | None, now: datetime | None = None) -> bool:
    return consent_state(row, now) == ConsentStatus.ACTIVE.value


def authorised_external_account_ids(
    db: Session, sme_id: str, now: datetime | None = None
) -> set[str]:
    """Account ids whose external data may be served right now.

    An external account is only authorised when it points at a consent that is
    currently active *and* the provider still holds a valid token for it.
    """
    now = now or _now()
    now_iso = iso(now)
    allowed: set[str] = set()
    rows = (
        db.execute(
            select(Account).where(
                Account.sme_id == sme_id,
                Account.source == AccountSource.AUTHORISED_EXTERNAL.value,
            )
        )
        .scalars()
        .all()
    )
    for acc in rows:
        if acc.consent_id is None:
            continue
        consent_row = db.get(Consent, acc.consent_id)
        if not is_consent_valid(consent_row, now):
            continue
        token = _PROVIDER.token_for_consent(acc.consent_id)
        if token is not None and token.is_valid(now_iso):
            allowed.add(acc.id)
    return allowed


def external_access_token(db: Session, sme_id: str, consent_id: str) -> AccessToken | None:
    """Token the backend presents to the adapter for external reads."""
    token = _PROVIDER.token_for_consent(consent_id)
    if token is None or token.sme_id != sme_id:
        return None
    return token


def reset_provider() -> None:
    """Test helper: clear the in-memory consent/token store."""
    global _PROVIDER
    _PROVIDER = SyntheticProvider()
