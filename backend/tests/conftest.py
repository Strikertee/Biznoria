"""Backend test fixtures.

Configuration is read at import time by ``app.config``, so the environment is
forced to a throwaway SQLite DB and a throwaway synthetic cache *before* any
``app`` import. We assign (not ``setdefault``) so a developer's exported
``DATABASE_URL`` can never point the tests at a real database.
"""
from __future__ import annotations

import json
import os
import sys
import tempfile
from pathlib import Path

# Make ``import app`` work no matter which directory pytest is invoked from.
_BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

_TMP = Path(tempfile.mkdtemp(prefix="biznoria-tests-"))
os.environ["DATABASE_URL"] = f"sqlite:///{(_TMP / 'test.db').as_posix()}"
os.environ["SYNTHETIC_DIR"] = str(_TMP / "synthetic")
os.environ["SEED_SMES"] = "12"
os.environ["SEED_DAYS"] = "150"
os.environ["SEED_SEED"] = "42"
os.environ["SEED_ON_STARTUP"] = "1"
os.environ["FRONTEND_ORIGIN"] = "http://localhost:5173"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

# PRD §9 canonical fixtures.
ADE = "ADE_FASHION_001"          # growing, consent active
TOLA = "TOLA_PHARMACY_002"       # stable, consent active
BISTRO = "LAGOS_BISTRO_003"      # volatile, consent expired
KANO = "KANO_ELECTRONICS_004"    # irregular, consent revoked
MART = "MART_DECLINE_005"        # declining, no consent at all

OFFICER: dict[str, str] = {}
SME_ADE: dict[str, str] = {"X-Role": "sme", "X-SME-Id": ADE}


@pytest.fixture(scope="session")
def client() -> TestClient:
    # Entering the context runs the app lifespan: create_all → seed → hydrate.
    with TestClient(app) as c:
        yield c


def assert_json_safe(payload: object) -> None:
    """No NaN / Infinity may ever reach the wire (TEST_PLAN)."""
    json.dumps(payload, allow_nan=False)


def assert_finite_numbers(node: object, path: str = "$") -> None:
    """Recursively assert every float is finite and never ``None`` in arrays."""
    import math

    if isinstance(node, dict):
        for key, value in node.items():
            assert_finite_numbers(value, f"{path}.{key}")
    elif isinstance(node, list):
        for index, value in enumerate(node):
            assert_finite_numbers(value, f"{path}[{index}]")
    elif isinstance(node, float):
        assert math.isfinite(node), f"non-finite float at {path}"
