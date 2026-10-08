"""Loan-simulation invariant: larger repayments never improve liquidity."""
from biznoria_ml.simulation import LOAN_DISCLAIMER, amortized_monthly_payment, simulate_loan


def test_amortized_payment_known_value():
    # 500k @ 24% / 12mo ≈ standard amortisation; sanity band only.
    pay = amortized_monthly_payment(500_000.0, 0.24, 12)
    assert 46_000 < pay < 49_000
    assert amortized_monthly_payment(120_000.0, 0.0, 12) == 10_000.0


def test_larger_repayment_does_not_improve_liquidity():
    nets = [200.0] * 90
    dates = [f"2026-10-{i + 1:02d}" for i in range(90)]
    small = simulate_loan(nets, dates, amount=100_000.0, annual_rate=0.12, term_months=12)
    large = simulate_loan(nets, dates, amount=900_000.0, annual_rate=0.12, term_months=12)
    assert large["monthly_repayment"] > small["monthly_repayment"]
    assert large["projected_min_liquidity"] <= small["projected_min_liquidity"]
    assert large["projected_mean_liquidity"] <= small["projected_mean_liquidity"]
    assert large["disclaimer"] == LOAN_DISCLAIMER
    assert len(large["series"]) == 90
