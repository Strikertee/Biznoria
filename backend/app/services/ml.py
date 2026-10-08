"""Bridge to the ML lane's pure-python package (``ml/src/biznoria_ml``).

The ML package is not pip-installed (it lives in the same monorepo), so we put
its ``src`` directory on ``sys.path`` by walking up from this file until we find
``ml/src/biznoria_ml/__init__.py``. This works identically from a local
checkout and from Render, where the whole repo is present.
"""
from __future__ import annotations

import sys
from pathlib import Path


def _ensure_on_path() -> Path:
    for parent in Path(__file__).resolve().parents:
        candidate = parent / "ml" / "src"
        if (candidate / "biznoria_ml" / "__init__.py").is_file():
            entry = str(candidate)
            if entry not in sys.path:
                sys.path.insert(0, entry)
            return candidate
    raise ImportError(
        "could not locate ml/src/biznoria_ml — expected it in the repo alongside backend/"
    )


ML_SRC = _ensure_on_path()

from biznoria_ml import (  # noqa: E402
    ALLOWED_HORIZONS,
    CREDIT_DISCLAIMER,
    LOAN_DISCLAIMER,
    WEIGHTS,
    amortized_monthly_payment,
    band,
    compute_health_metrics,
    forecast_future,
    score_from_metrics,
    simulate_loan,
    to_daily_net_flow,
)

__all__ = [
    "ALLOWED_HORIZONS",
    "CREDIT_DISCLAIMER",
    "LOAN_DISCLAIMER",
    "ML_SRC",
    "WEIGHTS",
    "amortized_monthly_payment",
    "band",
    "compute_health_metrics",
    "forecast_future",
    "score_from_metrics",
    "simulate_loan",
    "to_daily_net_flow",
]
