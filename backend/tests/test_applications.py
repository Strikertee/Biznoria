"""Loan application contract tests (additive surface — docs/DECISIONS.md CR-004).

The critical assertions: an SME may only apply for its own business, and the
officer's terminal action can never express approval or decline.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.services.ml import LOAN_DISCLAIMER

from .conftest import ADE, OFFICER, SME_ADE, TOLA, assert_finite_numbers, assert_json_safe

SME_TOLA = {"X-Role": "sme", "X-SME-Id": TOLA}

APP_FIELDS = {
    "id",
    "sme_id",
    "sme_name",
    "amount",
    "annual_rate",
    "term_months",
    "purpose",
    "monthly_repayment",
    "status",
    "status_label",
    "submitted_at",
    "recommendation",
    "recommendation_label",
    "recommendation_note",
    "recommendation_at",
    "reviewed_by",
    "disclaimer",
}

BANNED = ("approv", "declin", "reject", "guarantee")


def _apply(client: TestClient, sme_id: str = ADE, headers: dict[str, str] | None = None, **over):
    body = {
        "amount": 2_000_000,
        "annual_rate": 0.24,
        "term_months": 12,
        "purpose": "Boutique expansion",
        "consent": True,
        **over,
    }
    # NB: the officer fixture is an empty dict, so `headers or SME_ADE` would
    # wrongly fall through to the SME principal.
    return client.post(
        f"/api/v1/smes/{sme_id}/loan-applications",
        json=body,
        headers=SME_ADE if headers is None else headers,
    )


# --------------------------------------------------------------------------- #
# officer queue
# --------------------------------------------------------------------------- #
def test_officer_sees_the_seeded_queue(client: TestClient) -> None:
    res = client.get("/api/v1/loan-applications", headers=OFFICER)
    assert res.status_code == 200
    body = res.json()
    assert len(body) >= 3, "seeded applications should populate the officer queue"
    assert APP_FIELDS <= set(body[0])
    for row in body:
        assert row["status"] in {"submitted", "under_review", "recommendation_recorded"}
        assert row["disclaimer"] == LOAN_DISCLAIMER
        assert row["sme_name"], "the queue must show which business applied"
    assert_json_safe(body)
    assert_finite_numbers(body)


def test_queue_is_newest_first(client: TestClient) -> None:
    rows = client.get("/api/v1/loan-applications", headers=OFFICER).json()
    dates = [r["submitted_at"] for r in rows]
    assert dates == sorted(dates, reverse=True)


# --------------------------------------------------------------------------- #
# SME applies
# --------------------------------------------------------------------------- #
def test_sme_can_apply_for_its_own_facility(client: TestClient) -> None:
    res = _apply(client)
    assert res.status_code == 201
    body = res.json()
    assert APP_FIELDS <= set(body)
    assert body["sme_id"] == ADE
    assert body["sme_name"] == "Ade's Fashion Store"
    assert body["status"] == "submitted"
    assert body["status_label"] == "Submitted"
    assert body["monthly_repayment"] > 0
    assert body["recommendation"] is None
    assert body["disclaimer"] == LOAN_DISCLAIMER
    assert_json_safe(body)
    assert_finite_numbers(body)


def test_application_without_consent_is_rejected(client: TestClient) -> None:
    """The request is the trigger for the read-only data-sharing prompt."""
    res = _apply(client, consent=False)
    assert res.status_code == 422
    assert isinstance(res.json()["detail"], str)


def test_sme_cannot_apply_for_another_business(client: TestClient) -> None:
    res = _apply(client, sme_id=TOLA, headers=SME_ADE)
    assert res.status_code == 403


def test_sme_cannot_reach_the_officer_queue(client: TestClient) -> None:
    assert client.get("/api/v1/loan-applications", headers=SME_ADE).status_code == 403


def test_sme_sees_only_its_own_applications(client: TestClient) -> None:
    mine = client.get(f"/api/v1/smes/{ADE}/loan-applications", headers=SME_ADE)
    assert mine.status_code == 200
    assert all(r["sme_id"] == ADE for r in mine.json())

    other = client.get(f"/api/v1/smes/{TOLA}/loan-applications", headers=SME_ADE)
    assert other.status_code == 403


@pytest.mark.parametrize(
    "payload",
    [
        {"amount": -1},
        {"amount": 0},
        {"annual_rate": 5},
        {"term_months": 0},
        {"term_months": 500},
    ],
)
def test_application_validates_terms(client: TestClient, payload: dict) -> None:
    res = _apply(client, **payload)
    assert res.status_code == 422
    assert isinstance(res.json()["detail"], str)


# --------------------------------------------------------------------------- #
# officer recommendation — decision support only
# --------------------------------------------------------------------------- #
def test_officer_records_a_recommendation(client: TestClient) -> None:
    created = _apply(client).json()
    res = client.post(
        f"/api/v1/loan-applications/{created['id']}/recommendation",
        json={"recommendation": "recommend_for_review", "note": "Strong 90-day cushion."},
        headers=OFFICER,
    )
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "recommendation_recorded"
    assert body["recommendation"] == "recommend_for_review"
    assert body["recommendation_label"] == "Recommend for credit review"
    assert body["recommendation_note"] == "Strong 90-day cushion."
    assert body["reviewed_by"] == "officer"
    assert body["recommendation_at"].endswith("Z")


@pytest.mark.parametrize(
    "value", ["approve", "approved", "decline", "declined", "reject", "ACCEPT"]
)
def test_recommendation_cannot_express_approval_or_decline(
    client: TestClient, value: str
) -> None:
    """PRD rule 3: the platform never outputs an approval or a decline."""
    created = _apply(client).json()
    res = client.post(
        f"/api/v1/loan-applications/{created['id']}/recommendation",
        json={"recommendation": value},
        headers=OFFICER,
    )
    assert res.status_code == 422


def test_recommendation_labels_contain_no_decision_language(client: TestClient) -> None:
    created = _apply(client).json()
    for value in ("recommend_for_review", "request_more_information", "flag_for_monitoring"):
        res = client.post(
            f"/api/v1/loan-applications/{created['id']}/recommendation",
            json={"recommendation": value},
            headers=OFFICER,
        )
        assert res.status_code == 200
        label = res.json()["recommendation_label"].lower()
        for token in BANNED:
            assert token not in label, f"decision language leaked into {value!r}: {token}"


def test_sme_cannot_record_a_recommendation(client: TestClient) -> None:
    created = _apply(client).json()
    res = client.post(
        f"/api/v1/loan-applications/{created['id']}/recommendation",
        json={"recommendation": "recommend_for_review"},
        headers=SME_ADE,
    )
    assert res.status_code == 403


# --------------------------------------------------------------------------- #
# single application + 404s
# --------------------------------------------------------------------------- #
def test_officer_can_open_one_application(client: TestClient) -> None:
    created = _apply(client).json()
    res = client.get(f"/api/v1/loan-applications/{created['id']}", headers=OFFICER)
    assert res.status_code == 200
    assert res.json()["id"] == created["id"]


def test_sme_can_open_its_own_application(client: TestClient) -> None:
    created = _apply(client).json()
    res = client.get(f"/api/v1/loan-applications/{created['id']}", headers=SME_ADE)
    assert res.status_code == 200


def test_sme_cannot_open_another_business_application(client: TestClient) -> None:
    created = _apply(client, sme_id=TOLA, headers=SME_TOLA).json()
    res = client.get(f"/api/v1/loan-applications/{created['id']}", headers=SME_ADE)
    assert res.status_code == 403


def test_unknown_application_is_404(client: TestClient) -> None:
    assert client.get("/api/v1/loan-applications/APP-9999", headers=OFFICER).status_code == 404
    assert (
        client.post(
            "/api/v1/loan-applications/APP-9999/recommendation",
            json={"recommendation": "recommend_for_review"},
            headers=OFFICER,
        ).status_code
        == 404
    )


def test_apply_unknown_sme_is_404(client: TestClient) -> None:
    """As an officer (who may address any sme_id) an unknown id is a 404."""
    res = _apply(client, sme_id="sme_does_not_exist", headers=OFFICER)
    assert res.status_code == 404
    assert res.json() == {"detail": "SME not found"}


def test_sme_probing_an_unknown_id_is_403_not_404(client: TestClient) -> None:
    """Scope is checked before existence, so an SME cannot probe for other ids."""
    res = _apply(client, sme_id="sme_does_not_exist", headers=SME_ADE)
    assert res.status_code == 403
