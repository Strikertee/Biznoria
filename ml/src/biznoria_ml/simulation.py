"""Loan what-if simulation (decision support only).

Projects ``forecast_net - daily_repayment`` over the forecast window.
By construction a larger repayment can never improve projected liquidity
under otherwise identical conditions (subtracting a larger constant).
"""
from __future__ import annotations

LOAN_DISCLAIMER = "Decision support only — not a credit decision."


def amortized_monthly_payment(amount: float, annual_rate: float, term_months: int) -> float:
    if amount < 0:
        raise ValueError("amount must be non-negative")
    if term_months <= 0:
        raise ValueError("term_months must be positive")
    if annual_rate < 0:
        raise ValueError("annual_rate must be non-negative")
    if annual_rate == 0:
        return round(float(amount / term_months), 2)
    r = float(annual_rate) / 12.0
    pay = float(amount) * r / (1.0 - (1.0 + r) ** (-term_months))
    return round(pay, 2)


def simulate_loan(
    forecast_nets: list[float],
    forecast_dates: list[str],
    amount: float,
    annual_rate: float,
    term_months: int,
) -> dict:
    monthly = amortized_monthly_payment(amount, annual_rate, term_months)
    daily_repayment = round(monthly * 12.0 / 365.0, 2)
    nets = [float(v) for v in forecast_nets]
    projected = [round(v - daily_repayment, 2) for v in nets]
    series = [
        {"date": d, "projected_net": p} for d, p in zip(forecast_dates, projected)
    ]
    return {
        "monthly_repayment": monthly,
        "daily_repayment": daily_repayment,
        "projected_min_liquidity": round(min(projected), 2) if projected else 0.0,
        "projected_mean_liquidity": round(sum(projected) / len(projected), 2) if projected else 0.0,
        "series": series,
        "disclaimer": LOAN_DISCLAIMER,
    }
