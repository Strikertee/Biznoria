"""Mock Open Banking adapter interface + synthetic provider.

Owner: OPEN-BANKING-MOCK lane. ML lane provides the interface + lifecycle rules
so the backend skeleton compiles and all lanes share one consent model.

Consent lifecycle (ALAT for Business):
  apply-for-facility → secure consent prompt → customer approves →
  read-only token issued for a limited window → customer may revoke anytime.
Expired or revoked tokens immediately stop external data access. No live bank
connectivity; synthetic data only.
"""
from __future__ import annotations

import secrets
from abc import ABC, abstractmethod
from dataclasses import dataclass, field

READ_ONLY_SCOPES: tuple[str, ...] = ("accounts:read", "transactions:read")
# Write/payment scopes are deliberately absent from this prototype.


@dataclass(frozen=True)
class Consent:
    id: str
    sme_id: str
    provider: str  # "external_mock"
    scopes: tuple[str, ...]
    granted_at: str  # ISO 8601
    expires_at: str  # ISO 8601
    revoked_at: str | None = None

    def is_valid(self, now_iso: str) -> bool:
        if self.revoked_at is not None:
            return False
        return self.granted_at <= now_iso < self.expires_at


@dataclass(frozen=True)
class AccessToken:
    """Read-only, time-boxed token minted on customer approval."""

    token: str
    consent_id: str
    sme_id: str
    scopes: tuple[str, ...]
    issued_at: str  # ISO 8601
    expires_at: str  # ISO 8601
    revoked_at: str | None = None

    def is_valid(self, now_iso: str) -> bool:
        if self.revoked_at is not None:
            return False
        if "accounts:read" not in self.scopes:
            return False
        return self.issued_at <= now_iso < self.expires_at


def issue_token(
    consent: Consent,
    now_iso: str,
    token: str | None = None,
) -> AccessToken:
    """Mint a read-only token for an approved, currently-valid consent."""
    if not consent.is_valid(now_iso):
        raise ValueError("cannot issue a token for an invalid consent")
    scopes = tuple(s for s in consent.scopes if s in READ_ONLY_SCOPES)
    if not scopes:
        raise ValueError("consent grants no read-only scopes")
    return AccessToken(
        token=token or secrets.token_urlsafe(32),
        consent_id=consent.id,
        sme_id=consent.sme_id,
        scopes=scopes,
        issued_at=now_iso,
        expires_at=consent.expires_at,
    )


@dataclass(frozen=True)
class ExternalAccount:
    id: str
    sme_id: str
    provider: str
    label: str
    consent_id: str
    consent_expires_at: str
    source: str = "authorised_external"


class AccountProvider(ABC):
    """Common interface all providers (Wema-internal + external mock) implement."""

    @abstractmethod
    def list_accounts(self, sme_id: str, now_iso: str) -> list[dict]:
        raise NotImplementedError

    @abstractmethod
    def fetch_transactions(
        self, sme_id: str, account_id: str, now_iso: str, token: AccessToken | None = None
    ) -> list[dict]:
        """External providers MUST reject calls without a valid token."""
        raise NotImplementedError


class SyntheticProvider(AccountProvider):
    """Deterministic synthetic provider for demo only (TODO: OPEN-BANKING-MOCK
    lane to flesh out with seeded RNG + consent store wiring)."""

    def __init__(self) -> None:
        self._consents: dict[str, Consent] = {}
        self._tokens: dict[str, AccessToken] = {}

    # -- consent lifecycle -------------------------------------------------
    def request_consent(
        self, sme_id: str, scopes: tuple[str, ...], granted_at: str, expires_at: str
    ) -> Consent:
        """Record the secure in-app prompt outcome (approval path)."""
        consent = Consent(
            id=f"cons_{sme_id}_{len(self._consents) + 1}",
            sme_id=sme_id,
            provider="external_mock",
            scopes=scopes,
            granted_at=granted_at,
            expires_at=expires_at,
        )
        self._consents[consent.id] = consent
        return consent

    def approve_consent(self, consent_id: str, now_iso: str) -> AccessToken:
        """Customer approved → mint the read-only, time-boxed token."""
        consent = self._consents[consent_id]
        token = issue_token(consent, now_iso)
        self._tokens[token.token] = token
        return token

    def revoke_consent(self, consent_id: str, now_iso: str) -> None:
        """Customer revoked → consent and all its tokens die immediately."""
        consent = self._consents[consent_id]
        self._consents[consent_id] = Consent(
            id=consent.id,
            sme_id=consent.sme_id,
            provider=consent.provider,
            scopes=consent.scopes,
            granted_at=consent.granted_at,
            expires_at=consent.expires_at,
            revoked_at=now_iso,
        )
        for t, tok in list(self._tokens.items()):
            if tok.consent_id == consent_id:
                self._tokens[t] = AccessToken(
                    token=tok.token,
                    consent_id=tok.consent_id,
                    sme_id=tok.sme_id,
                    scopes=tok.scopes,
                    issued_at=tok.issued_at,
                    expires_at=tok.expires_at,
                    revoked_at=now_iso,
                )

    def _check_token(self, sme_id: str, token: AccessToken | None, now_iso: str) -> bool:
        if token is None or token.sme_id != sme_id:
            return False
        stored = self._tokens.get(token.token)
        if stored is None:
            return False  # unknown token — never trust the presented copy alone
        return stored.is_valid(now_iso)

    # -- data access (consent-gated) ----------------------------------------
    def list_accounts(self, sme_id: str, now_iso: str) -> list[dict]:
        internal = [
            {
                "id": f"acc_wema_{sme_id}",
                "sme_id": sme_id,
                "provider": "wema",
                "label": "Wema Current ****1234",
                "consent_id": None,
                "consent_expires_at": None,
                "source": "internal",
            }
        ]
        valid = [
            c for c in self._consents.values() if c.sme_id == sme_id and c.is_valid(now_iso)
        ]
        external = [
            {
                "id": f"acc_ext_{c.id}",
                "sme_id": sme_id,
                "provider": "external_mock",
                "label": "External Current ****5678",
                "consent_id": c.id,
                "consent_expires_at": c.expires_at,
                "source": "authorised_external",
            }
            for c in valid
        ]
        return internal + external

    def fetch_transactions(
        self, sme_id: str, account_id: str, now_iso: str, token: AccessToken | None = None
    ) -> list[dict]:
        if account_id.startswith("acc_ext_"):
            if not self._check_token(sme_id, token, now_iso):
                return []  # no valid token → no external rows, never an error leak
            return [
                {
                    "sme_id": sme_id,
                    "account_id": account_id,
                    "date": now_iso[:10],
                    "amount": 1000.0,
                    "direction": "inflow",
                    "source": "authorised_external",
                }
            ]
        return []
