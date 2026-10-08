"""Role-based access stub (TODO: BACKEND-API lane with real auth).

Roles: "sme" (customer in ALAT for Business — own data, review-only surface)
and "officer" (portfolio, drill-down, simulator, combined tasks).
The SME-visible surface is cash-flow/health/forecast/credit ONLY; the simulator
and cross-SME views are officer-only. Consent/token gating for external data
applies on BOTH roles (see adapters/openbanking.py).

This stub compiles so routers can declare dependencies; enforcement lands
with authentication.
"""
from __future__ import annotations

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
)


def is_allowed(role: str, method: str, path: str, own_sme_id: str | None = None) -> bool:
    """Pure authorization rule — unit-testable without auth wiring."""
    if role == "officer":
        return True
    if role != "sme":
        return False
    if method.upper() == "POST":
        return False  # simulator + any future writes are officer-only
    if path == "/api/v1/smes":
        return False  # no cross-SME listing for customers
    if path.startswith("/api/v1/portfolio"):
        return False
    if path.startswith("/api/v1/smes/"):
        if own_sme_id is not None and f"/api/v1/smes/{own_sme_id}" not in path:
            return False  # customers can only address their own sme_id
        return any(path.endswith(s) for s in SME_ALLOWED_SUFFIXES) or path.count("/") == 4
    return False
