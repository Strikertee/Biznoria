"""Role-based access control.

Two roles, one frozen contract (PRD §11):
- ``sme``     — customer in ALAT for Business. Own data only, review-only
                surface: profile, health, cash flow, forecast, credit readiness,
                accounts. Never the portfolio, never the SME list, never the
                simulator.
- ``officer`` — account officer. All P0 endpoints.

Enforcement is a backend guard + ``sme_id`` scoping. The frontend renders per
role but never enforces.

Demo authentication (hackathon scope — PRD §5.7 keeps real RBAC as P1): the
caller states its role via headers.

    X-Role: officer                (default when the header is absent)
    X-Role: sme  +  X-SME-Id: ...   (customer session)

``is_allowed`` is the pure, unit-testable rule; the FastAPI dependencies below
apply it to real requests.
"""
from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException

OFFICER_ONLY_PREFIXES: tuple[str, ...] = (
    "/api/v1/portfolio",
    "/api/v1/smes",  # list endpoint; detail scoping handled per-route below
)

SME_ALLOWED_SUFFIXES: tuple[str, ...] = (
    "/health",
    "/cashflow",
    "/forecast",
    "/credit-readiness",
    "/accounts",
    "/loan-applications",
)

ROLE_SME = "sme"
ROLE_OFFICER = "officer"


def is_allowed(role: str, method: str, path: str, own_sme_id: str | None = None) -> bool:
    """Pure authorization rule — unit-testable without auth wiring."""
    if role == "officer":
        return True
    if role != "sme":
        return False
    # Officer-only surfaces: the portfolio, the SME list, the application queue
    # and the recommendation endpoint.
    if path == "/api/v1/smes" or path.startswith("/api/v1/portfolio"):
        return False
    if path.startswith("/api/v1/loan-applications"):
        return False
    if not path.startswith("/api/v1/smes/"):
        return False
    if own_sme_id is not None and f"/api/v1/smes/{own_sme_id}" not in path:
        return False  # customers can only address their own sme_id
    if method.upper() == "POST":
        # The one write an SME may perform: applying for a facility on its own
        # business. The simulator and everything else stay officer-only.
        return path.endswith("/loan-applications")
    return any(path.endswith(s) for s in SME_ALLOWED_SUFFIXES) or path.count("/") == 4


@dataclass(frozen=True)
class Principal:
    """The authenticated caller for this request."""

    role: str
    sme_id: str | None = None

    @property
    def is_officer(self) -> bool:
        return self.role == ROLE_OFFICER


def get_principal(
    x_role: str | None = Header(default=None, alias="X-Role"),
    x_sme_id: str | None = Header(default=None, alias="X-SME-Id"),
) -> Principal:
    role = (x_role or ROLE_OFFICER).strip().lower()
    if role not in {ROLE_SME, ROLE_OFFICER}:
        raise HTTPException(status_code=403, detail=f"unknown role: {role!r}")
    if role == ROLE_SME:
        if not x_sme_id:
            raise HTTPException(status_code=403, detail="sme role requires the X-SME-Id header")
        return Principal(role=role, sme_id=x_sme_id.strip())
    return Principal(role=role)


def require_officer(principal: Principal = Depends(get_principal)) -> Principal:
    """Officer-only endpoints: portfolio, SME list, loan simulator."""
    if not principal.is_officer:
        raise HTTPException(status_code=403, detail="officer role required")
    return principal


def scope_to_own_sme(sme_id: str, principal: Principal) -> None:
    """Customers may only address their own ``sme_id`` (never client-tamperable)."""
    if principal.is_officer:
        return
    if principal.sme_id != sme_id:
        raise HTTPException(status_code=403, detail="not permitted for this SME")
