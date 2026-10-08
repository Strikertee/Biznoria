"""Prototype credit-readiness score 0–100 (decision support ONLY).

Frozen weights: stability 25%, revenue consistency 20%, growth 20%,
repayment 20%, forecast liquidity 15%. Every component is 0–100 and the final
score is the explicit weighted sum — no hidden terms, no black box.
"""
from __future__ import annotations

from .metrics import compute_health_metrics

WEIGHTS: dict[str, float] = {
    "stability": 0.25,
    "revenue_consistency": 0.20,
    "growth": 0.20,
    "repayment": 0.20,
    "liquidity": 0.15,
}

CREDIT_DISCLAIMER = (
    "Prototype decision support only — not Wema underwriting. "
    "Not an approval or decline."
)

_BANNED_TOKENS = ("approv", "declin", "reject", "guarantee")


def _check_components(components: dict[str, float]) -> None:
    missing = [k for k in WEIGHTS if k not in components]
    if missing:
        raise ValueError(f"missing credit components: {missing}")
    for k, v in components.items():
        if v is None or not 0.0 <= float(v) <= 100.0:
            raise ValueError(f"component {k!r} out of 0–100 range: {v!r}")


def band(score: float) -> str:
    """Descriptive band only — never approval/decline language."""
    if score >= 75:
        return "strong"
    if score >= 55:
        return "developing"
    if score >= 35:
        return "emerging"
    return "fragile"


def _reasons(components: dict[str, float]) -> list[str]:
    out: list[str] = []
    if components["stability"] >= 70:
        out.append("Cash flow has been stable over the recent window.")
    elif components["stability"] < 40:
        out.append("Cash flow is volatile with frequent negative days.")
    else:
        out.append("Cash flow shows moderate stability.")
    if components["revenue_consistency"] >= 70:
        out.append("Revenue arrives regularly.")
    elif components["revenue_consistency"] < 40:
        out.append("Revenue is irregular — several low- or no-inflow days.")
    else:
        out.append("Revenue is fairly consistent.")
    if components["growth"] >= 60:
        out.append("Positive growth trend in net cash flow.")
    elif components["growth"] < 40:
        out.append("Net cash flow trend is declining.")
    else:
        out.append("Growth trend is flat.")
    if components["repayment"] >= 70:
        out.append("Good repayment behaviour on observed obligations.")
    elif components["repayment"] < 40:
        out.append("Weak or limited repayment history observed.")
    else:
        out.append("Repayment history is limited or mixed.")
    if components["liquidity"] >= 70:
        out.append("Forecast liquidity cushion looks comfortable.")
    elif components["liquidity"] < 40:
        out.append("Forecast liquidity is thin — shortfalls are likely.")
    else:
        out.append("Forecast liquidity is adequate but not ample.")
    return out


def score_credit_readiness(components: dict[str, float]) -> dict:
    """Score pre-computed 0–100 components with the frozen weights."""
    _check_components(components)
    if abs(sum(WEIGHTS.values()) - 1.0) > 1e-9:
        raise ValueError("credit weights must sum to 1.0")
    score = round(float(sum(components[k] * WEIGHTS[k] for k in WEIGHTS)), 2)
    score = max(0.0, min(100.0, score))
    comp = {k: round(float(components[k]), 2) for k in WEIGHTS}
    return {
        "score": score,
        "band": band(score),
        "components": comp,
        "weights": dict(WEIGHTS),
        "reasons": _reasons(comp),
        "disclaimer": CREDIT_DISCLAIMER,
    }


def score_from_metrics(metrics: dict) -> dict:
    """Convenience: map a ``compute_health_metrics`` result onto credit inputs."""
    return score_credit_readiness(
        {
            "stability": metrics["stability"],
            "revenue_consistency": metrics["revenue_consistency"],
            "growth": metrics["growth"],
            "repayment": metrics["repayment_score"],
            "liquidity": metrics["liquidity"],
        }
    )


def score_from_daily(daily, on_time_ratio=None, forecast_mean=None) -> dict:
    """End-to-end helper: daily frame → metrics → weighted prototype score."""
    metrics = compute_health_metrics(daily, on_time_ratio, forecast_mean)
    result = score_from_metrics(metrics)
    result["metrics"] = metrics
    return result
