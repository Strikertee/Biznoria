"""P0 API contract tests — assert the FROZEN contract in docs/API_CONTRACT.md.

Owner: BACKEND-API (+ QA lane). Covers every frozen route, error codes, the
consent gate, disclaimer strings, the simulation invariant, CORS and the
"no NaN/null on the wire" rule from docs/TEST_PLAN.md.
"""
from __future__ import annotations

from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from app.services.ml import ALLOWED_HORIZONS, CREDIT_DISCLAIMER, LOAN_DISCLAIMER, WEIGHTS

from .conftest import (
    ADE,
    BISTRO,
    KANO,
    MART,
    TOLA,
    assert_finite_numbers,
    assert_json_safe,
)

SME_FIELDS = {"id", "name", "sector", "size_band", "region", "joined_on"}
HEALTH_FIELDS = {
    "sme_id",
    "stability",
    "growth",
    "liquidity",
    "expense_ratio",
    "revenue_consistency",
    "repayment_score",
    "updated_at",
}
CREDIT_COMPONENT_KEYS = {"stability", "revenue_consistency", "growth", "repayment", "liquidity"}
BANNED_TOKENS = ("approv", "declin", "reject", "guarantee")


# --------------------------------------------------------------------------- #
# ops endpoints
# --------------------------------------------------------------------------- #
def test_healthz(client: TestClient) -> None:
    res = client.get("/healthz")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_readyz_reports_db_and_seed(client: TestClient) -> None:
    res = client.get("/readyz")
    assert res.status_code == 200
    body = res.json()
    assert set(body) == {"ready", "checks"}
    assert body["checks"]["db"] is True
    assert body["checks"]["seed"] is True
    assert body["ready"] is True


# --------------------------------------------------------------------------- #
# portfolio + SME
# --------------------------------------------------------------------------- #
def test_portfolio_summary_shape(client: TestClient) -> None:
    res = client.get("/api/v1/portfolio/summary")
    assert res.status_code == 200
    body = res.json()
    for key in (
        "sme_count",
        "total_inflow_30d",
        "total_outflow_30d",
        "net_flow_30d",
        "median_health_score",
        "at_risk_count",
    ):
        assert key in body, f"missing frozen field {key}"
    assert body["sme_count"] > 0
    assert body["net_flow_30d"] == pytest.approx(
        body["total_inflow_30d"] - body["total_outflow_30d"], abs=0.02
    )
    assert 0 <= body["median_health_score"] <= 100
    assert_json_safe(body)
    assert_finite_numbers(body)


def test_list_smes_returns_frozen_shape(client: TestClient) -> None:
    res = client.get("/api/v1/smes")
    assert res.status_code == 200
    body = res.json()
    assert isinstance(body, list) and body
    assert SME_FIELDS <= set(body[0])
    ids = {s["id"] for s in body}
    assert {ADE, TOLA, BISTRO, KANO, MART} <= ids, "PRD §9 fixtures must be seeded"


def test_get_sme_detail(client: TestClient) -> None:
    res = client.get(f"/api/v1/smes/{ADE}")
    assert res.status_code == 200
    body = res.json()
    assert body["id"] == ADE
    assert body["name"] == "Ade's Fashion Store"
    assert SME_FIELDS <= set(body)


def test_unknown_sme_is_404_with_contract_detail(client: TestClient) -> None:
    res = client.get("/api/v1/smes/sme_does_not_exist")
    assert res.status_code == 404
    assert res.json() == {"detail": "SME not found"}


@pytest.mark.parametrize(
    "suffix", ["health", "cashflow", "forecast", "credit-readiness", "accounts"]
)
def test_unknown_sme_404_on_every_subroute(client: TestClient, suffix: str) -> None:
    res = client.get(f"/api/v1/smes/sme_does_not_exist/{suffix}")
    assert res.status_code == 404
    assert res.json() == {"detail": "SME not found"}


# --------------------------------------------------------------------------- #
# health
# --------------------------------------------------------------------------- #
def test_health_metrics_bounds_and_units(client: TestClient) -> None:
    res = client.get(f"/api/v1/smes/{ADE}/health")
    assert res.status_code == 200
    body = res.json()
    assert HEALTH_FIELDS <= set(body)
    assert body["sme_id"] == ADE
    for key in ("stability", "growth", "liquidity", "revenue_consistency", "repayment_score"):
        assert 0.0 <= body[key] <= 100.0, f"{key} out of 0-100"
    assert body["expense_ratio"] >= 0.0
    assert body["updated_at"].endswith("Z")
    assert body["trend"] in {"growing", "stable", "declining", "volatile"}
    assert body["status"] in {"healthy", "watch", "risk"}
    assert 2 <= len(body["insights"]) <= 4
    assert_json_safe(body)
    assert_finite_numbers(body)


def test_health_fixture_stories_match_prd(client: TestClient) -> None:
    """PRD §9 fixture behaviours must be reproducible on every device."""
    health = {
        sme: client.get(f"/api/v1/smes/{sme}/health").json()
        for sme in (ADE, TOLA, BISTRO, KANO, MART)
    }

    assert health[ADE]["trend"] == "growing", "Ade's Fashion Store grows"
    assert health[TOLA]["trend"] == "stable", "Tola Pharmacy is the stable one"
    assert health[BISTRO]["trend"] == "volatile", "Lagos Bistro is the volatile one"
    assert health[MART]["trend"] == "declining", "Marina Mart declines"

    assert health[ADE]["status"] == "healthy"
    assert health[TOLA]["status"] == "healthy"
    assert health[MART]["status"] == "risk", "Marina Mart is the high-pressure case"

    assert health[TOLA]["stability"] > health[ADE]["stability"]
    assert health[MART]["health_score"] < health[TOLA]["health_score"]


def test_declining_fixture_forecast_is_high_pressure(client: TestClient) -> None:
    body = client.get(f"/api/v1/smes/{MART}/forecast", params={"horizon": 90}).json()
    assert body["status"] == "high_pressure"


def test_growing_fixture_forecast_is_positive(client: TestClient) -> None:
    body = client.get(f"/api/v1/smes/{ADE}/forecast", params={"horizon": 90}).json()
    assert body["projected_mean_net"] > 0
    assert body["status"] in {"healthy", "watch"}


# --------------------------------------------------------------------------- #
# cashflow
# --------------------------------------------------------------------------- #
def test_cashflow_series_contract(client: TestClient) -> None:
    res = client.get(f"/api/v1/smes/{ADE}/cashflow")
    assert res.status_code == 200
    body = res.json()
    assert body["sme_id"] == ADE
    assert body["grain"] == "daily"
    assert body["points"], "cash-flow series must not be empty"
    first = body["points"][0]
    assert {"date", "inflow", "outflow", "net"} <= set(first)
    assert first["net"] == pytest.approx(first["inflow"] - first["outflow"], abs=0.02)
    assert_json_safe(body)
    assert_finite_numbers(body)


def test_cashflow_date_filter(client: TestClient) -> None:
    full = client.get(f"/api/v1/smes/{ADE}/cashflow").json()["points"]
    last = date.fromisoformat(full[-1]["date"])
    start = last - timedelta(days=6)

    res = client.get(f"/api/v1/smes/{ADE}/cashflow", params={"from": start.isoformat()})
    assert res.status_code == 200
    points = res.json()["points"]
    assert 0 < len(points) < len(full)
    assert all(p["date"] >= start.isoformat() for p in points)


# --------------------------------------------------------------------------- #
# forecast
# --------------------------------------------------------------------------- #
@pytest.mark.parametrize("horizon", ALLOWED_HORIZONS)
def test_forecast_exact_horizon_length(client: TestClient, horizon: int) -> None:
    res = client.get(f"/api/v1/smes/{ADE}/forecast", params={"horizon": horizon})
    assert res.status_code == 200
    body = res.json()
    assert body["horizon"] == horizon
    assert len(body["points"]) == horizon
    assert {"date", "yhat"} <= set(body["points"][0])
    assert body["model_used"] in {"baseline", "hgb"}
    assert body["status"] in {"healthy", "watch", "high_pressure"}
    assert_json_safe(body)
    assert_finite_numbers(body)


def test_forecast_default_horizon_is_90(client: TestClient) -> None:
    body = client.get(f"/api/v1/smes/{ADE}/forecast").json()
    assert body["horizon"] == 90
    assert len(body["points"]) == 90


def test_forecast_bad_horizon_is_422(client: TestClient) -> None:
    res = client.get(f"/api/v1/smes/{ADE}/forecast", params={"horizon": 45})
    assert res.status_code == 422
    assert isinstance(res.json()["detail"], str)


def test_forecast_points_start_after_history_and_are_contiguous(client: TestClient) -> None:
    points = client.get(f"/api/v1/smes/{ADE}/forecast", params={"horizon": 30}).json()["points"]
    dates = [date.fromisoformat(p["date"]) for p in points]
    for prev, nxt in zip(dates, dates[1:]):
        assert nxt - prev == timedelta(days=1), "forecast dates must be contiguous daily"

    history_last = date.fromisoformat(
        client.get(f"/api/v1/smes/{ADE}/cashflow").json()["points"][-1]["date"]
    )
    assert dates[0] == history_last + timedelta(days=1)


# --------------------------------------------------------------------------- #
# credit readiness
# --------------------------------------------------------------------------- #
def test_credit_readiness_contract(client: TestClient) -> None:
    res = client.get(f"/api/v1/smes/{ADE}/credit-readiness")
    assert res.status_code == 200
    body = res.json()
    assert body["sme_id"] == ADE
    assert 0.0 <= body["score"] <= 100.0
    assert set(body["components"]) == CREDIT_COMPONENT_KEYS
    assert all(0.0 <= v <= 100.0 for v in body["components"].values())
    assert body["disclaimer"] == CREDIT_DISCLAIMER, "disclaimer must be verbatim"
    assert body["reasons"], "reasons must be non-empty"
    assert_json_safe(body)
    assert_finite_numbers(body)


def test_credit_weights_sum_to_one_and_match_frozen_values(client: TestClient) -> None:
    body = client.get(f"/api/v1/smes/{ADE}/credit-readiness").json()
    assert body["weights"] == WEIGHTS
    assert sum(body["weights"].values()) == pytest.approx(1.0)


def test_credit_score_is_weighted_sum_of_components(client: TestClient) -> None:
    body = client.get(f"/api/v1/smes/{ADE}/credit-readiness").json()
    expected = sum(body["components"][k] * WEIGHTS[k] for k in WEIGHTS)
    assert body["score"] == pytest.approx(expected, abs=0.02)


def test_credit_language_never_approves_or_declines(client: TestClient) -> None:
    body = client.get(f"/api/v1/smes/{ADE}/credit-readiness").json()
    # The verbatim disclaimer legitimately contains "not an approval or decline".
    scanned = " ".join(
        body["reasons"] + body["positive_drivers"] + body["negative_drivers"]
    ).lower()
    for token in BANNED_TOKENS:
        assert token not in scanned, f"decision language leaked: {token!r}"


# --------------------------------------------------------------------------- #
# accounts + consent gate
# --------------------------------------------------------------------------- #
def test_active_consent_exposes_external_account_with_metadata(client: TestClient) -> None:
    accounts = client.get(f"/api/v1/smes/{ADE}/accounts").json()
    internal = [a for a in accounts if a["source"] == "internal"]
    external = [a for a in accounts if a["source"] == "authorised_external"]

    assert len(internal) == 1 and internal[0]["provider"] == "wema"
    assert internal[0]["consent_id"] is None
    assert internal[0]["consent_status"] == "not_connected"

    assert external, "an active consent must expose the external account"
    ext = external[0]
    assert ext["provider"] == "external_mock"
    assert ext["consent_id"], "external rows must carry consent metadata"
    assert ext["consent_expires_at"], "external rows must carry the consent expiry"
    assert ext["consent_status"] == "active"
    assert ext["masked_account"], "account identifiers must be masked (PRD §18)"


def test_no_consent_means_no_external_rows(client: TestClient) -> None:
    accounts = client.get(f"/api/v1/smes/{MART}/accounts").json()
    assert [a["source"] for a in accounts] == ["internal"]


@pytest.mark.parametrize(
    ("sme_id", "expected_status"), [(BISTRO, "expired"), (KANO, "revoked")]
)
def test_expired_or_revoked_consent_serves_no_external_data(
    client: TestClient, sme_id: str, expected_status: str
) -> None:
    accounts = client.get(f"/api/v1/smes/{sme_id}/accounts").json()
    external = [a for a in accounts if a["source"] == "authorised_external"]
    assert external and external[0]["consent_status"] == expected_status

    # ...but the data itself must be excluded everywhere.
    series = client.get(f"/api/v1/smes/{sme_id}/cashflow").json()
    assert series["data_sources"] == ["wema"]


def test_active_consent_unifies_external_data(client: TestClient) -> None:
    series = client.get(f"/api/v1/smes/{ADE}/cashflow").json()
    assert series["data_sources"] == ["wema", "external"]


# --------------------------------------------------------------------------- #
# loan simulation
# --------------------------------------------------------------------------- #
def _simulate(
    client: TestClient, sme_id: str, amount: float, rate: float = 0.24, months: int = 12
):
    return client.post(
        f"/api/v1/smes/{sme_id}/loan-simulation",
        json={"amount": amount, "annual_rate": rate, "term_months": months},
    )


def test_loan_simulation_contract(client: TestClient) -> None:
    res = _simulate(client, ADE, 2_000_000)
    assert res.status_code == 200
    body = res.json()
    assert body["sme_id"] == ADE
    assert body["monthly_repayment"] > 0
    assert body["disclaimer"] == LOAN_DISCLAIMER, "disclaimer must be verbatim"
    assert body["series"] and {"date", "projected_net"} <= set(body["series"][0])
    assert body["impact"] in {"manageable", "watch", "high_pressure"}
    assert_json_safe(body)
    assert_finite_numbers(body)


def test_larger_repayment_never_improves_projected_liquidity(client: TestClient) -> None:
    """PRD §8 / §12 — the frozen simulation invariant."""
    small = _simulate(client, ADE, 500_000).json()
    large = _simulate(client, ADE, 5_000_000).json()

    assert large["monthly_repayment"] > small["monthly_repayment"]
    assert large["projected_mean_liquidity"] <= small["projected_mean_liquidity"]
    assert large["projected_min_liquidity"] <= small["projected_min_liquidity"]

    order = {"manageable": 0, "watch": 1, "high_pressure": 2}
    assert order[large["impact"]] >= order[small["impact"]], "impact must not improve"


def test_loan_simulation_series_has_90_points_and_baseline(client: TestClient) -> None:
    body = _simulate(client, ADE, 1_000_000).json()
    assert len(body["series"]) == 90
    for point in body["series"]:
        assert point["projected_net"] <= point["baseline_net"] + 1e-6


@pytest.mark.parametrize(
    "payload",
    [
        {"amount": -1, "annual_rate": 0.2, "term_months": 12},
        {"amount": 1000, "annual_rate": 0.2, "term_months": 0},
        {"amount": 1000, "annual_rate": 5, "term_months": 12},
        {"amount": 1000, "annual_rate": 0.2},
    ],
)
def test_loan_simulation_rejects_bad_input(client: TestClient, payload: dict) -> None:
    res = client.post(f"/api/v1/smes/{ADE}/loan-simulation", json=payload)
    assert res.status_code == 422
    assert isinstance(res.json()["detail"], str)


def test_loan_simulation_unknown_sme_404(client: TestClient) -> None:
    res = _simulate(client, "sme_does_not_exist", 1000)
    assert res.status_code == 404
    assert res.json() == {"detail": "SME not found"}


# --------------------------------------------------------------------------- #
# CORS + smoke
# --------------------------------------------------------------------------- #
def test_cors_allows_the_frontend_origin(client: TestClient) -> None:
    res = client.options(
        "/api/v1/portfolio/summary",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert res.status_code in (200, 204)
    assert res.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_full_p0_smoke_flow(client: TestClient) -> None:
    """portfolio → sme → health → cashflow → forecast → credit → accounts → simulator."""
    assert client.get("/api/v1/portfolio/summary").status_code == 200
    assert client.get("/api/v1/smes").status_code == 200
    assert client.get(f"/api/v1/smes/{ADE}").status_code == 200
    assert client.get(f"/api/v1/smes/{ADE}/health").status_code == 200
    assert client.get(f"/api/v1/smes/{ADE}/cashflow").status_code == 200
    assert client.get(f"/api/v1/smes/{ADE}/forecast", params={"horizon": 90}).status_code == 200
    assert client.get(f"/api/v1/smes/{ADE}/credit-readiness").status_code == 200
    assert client.get(f"/api/v1/smes/{ADE}/accounts").status_code == 200
    assert _simulate(client, ADE, 2_000_000).status_code == 200
    assert client.get("/healthz").status_code == 200
    assert client.get("/readyz").json()["ready"] is True
