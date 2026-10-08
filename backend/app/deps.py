"""Shared FastAPI dependencies and small numeric helpers."""
from __future__ import annotations

import math

from fastapi import HTTPException
from sqlalchemy.orm import Session

from .models import SME


def load_sme_or_404(db: Session, sme_id: str) -> SME:
    sme = db.get(SME, sme_id)
    if sme is None:
        raise HTTPException(status_code=404, detail="SME not found")
    return sme


def f(x: object, nd: int = 2) -> float:
    """Finite, rounded float — guarantees no ``NaN``/``Infinity`` reaches JSON."""
    try:
        value = float(x)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return 0.0
    if not math.isfinite(value):
        return 0.0
    return round(value, nd)
