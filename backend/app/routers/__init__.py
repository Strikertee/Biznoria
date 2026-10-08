"""Frozen API routers. Paths must match docs/API_CONTRACT.md exactly."""
from .accounts import router as accounts_router
from .portfolio import router as portfolio_router
from .simulation import router as simulation_router
from .smes import router as smes_router

__all__ = ["accounts_router", "portfolio_router", "simulation_router", "smes_router"]
