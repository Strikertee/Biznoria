"""Role-based access tests (PRD §11, docs/API_CONTRACT.md authorization section)."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.auth import is_allowed

from .conftest import ADE, MART, SME_ADE, TOLA

SME_READ_ROUTES = [
    f"/api/v1/smes/{ADE}",
    f"/api/v1/smes/{ADE}/health",
    f"/api/v1/smes/{ADE}/cashflow",
    f"/api/v1/smes/{ADE}/forecast",
    f"/api/v1/smes/{ADE}/credit-readiness",
    f"/api/v1/smes/{ADE}/accounts",
]

SME_FORBIDDEN_ROUTES = [
    "/api/v1/portfolio/summary",
    "/api/v1/smes",
]


# --------------------------------------------------------------------------- #
# pure rule
# --------------------------------------------------------------------------- #
def test_is_allowed_officer_can_reach_everything() -> None:
    assert is_allowed("officer", "GET", "/api/v1/portfolio/summary")
    assert is_allowed("officer", "GET", "/api/v1/smes")
    assert is_allowed("officer", "POST", f"/api/v1/smes/{ADE}/loan-simulation")


def test_is_allowed_sme_is_scoped_to_its_own_review_surface() -> None:
    for route in SME_READ_ROUTES:
        assert is_allowed("sme", "GET", route, own_sme_id=ADE), route

    assert not is_allowed("sme", "GET", "/api/v1/portfolio/summary", own_sme_id=ADE)
    assert not is_allowed("sme", "GET", "/api/v1/smes", own_sme_id=ADE)
    assert not is_allowed("sme", "POST", f"/api/v1/smes/{ADE}/loan-simulation", own_sme_id=ADE)
    assert not is_allowed("sme", "GET", f"/api/v1/smes/{TOLA}/health", own_sme_id=ADE)


def test_is_allowed_unknown_role_is_denied() -> None:
    assert not is_allowed("admin", "GET", "/api/v1/smes")


# --------------------------------------------------------------------------- #
# enforced over HTTP
# --------------------------------------------------------------------------- #
def test_officer_is_the_default_principal(client: TestClient) -> None:
    assert client.get("/api/v1/portfolio/summary").status_code == 200
    assert client.get("/api/v1/smes").status_code == 200


@pytest.mark.parametrize("route", SME_READ_ROUTES)
def test_sme_can_read_its_own_surface(client: TestClient, route: str) -> None:
    assert client.get(route, headers=SME_ADE).status_code == 200


@pytest.mark.parametrize("route", SME_FORBIDDEN_ROUTES)
def test_sme_cannot_reach_officer_only_reads(client: TestClient, route: str) -> None:
    res = client.get(route, headers=SME_ADE)
    assert res.status_code == 403
    assert isinstance(res.json()["detail"], str)


def test_sme_cannot_run_the_simulator(client: TestClient) -> None:
    res = client.post(
        f"/api/v1/smes/{ADE}/loan-simulation",
        json={"amount": 1_000_000, "annual_rate": 0.24, "term_months": 12},
        headers=SME_ADE,
    )
    assert res.status_code == 403


def test_sme_cannot_read_another_smes_data(client: TestClient) -> None:
    res = client.get(f"/api/v1/smes/{MART}/health", headers=SME_ADE)
    assert res.status_code == 403
    assert isinstance(res.json()["detail"], str)


def test_sme_role_requires_an_sme_id_header(client: TestClient) -> None:
    res = client.get(f"/api/v1/smes/{ADE}/health", headers={"X-Role": "sme"})
    assert res.status_code == 403


def test_unknown_role_is_rejected(client: TestClient) -> None:
    res = client.get("/api/v1/smes", headers={"X-Role": "wizard"})
    assert res.status_code == 403


def test_officer_header_is_accepted_explicitly(client: TestClient) -> None:
    res = client.get("/api/v1/portfolio/summary", headers={"X-Role": "officer"})
    assert res.status_code == 200
