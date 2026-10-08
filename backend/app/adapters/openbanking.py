"""Mock Open Banking adapter interface + synthetic provider.

Owner: OPEN-BANKING-MOCK lane. ML lane provides the interface only so the
backend skeleton compiles. Consent-based: external data requires a valid,
unexpired, unrevoked consent. Never expose external rows without consent.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


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
    def fetch_transactions(self, sme_id: str, account_id: str, now_iso: str) -> list[dict]:
        raise NotImplementedError


class SyntheticProvider(AccountProvider):
    """Deterministic synthetic provider for demo only (TODO: OPEN-BANKING-MOCK
    lane to flesh out with seeded RNG + consent store wiring)."""

    def list_accounts(self, sme_id: str, now_iso: str) -> list[dict]:
        return [
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

    def fetch_transactions(self, sme_id: str, account_id: str, now_iso: str) -> list[dict]:
        return []
