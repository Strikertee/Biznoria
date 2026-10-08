"""Runtime configuration (env-driven, 12-factor).

Defaults are chosen so the prototype runs with zero configuration on a laptop
(SQLite) while Render supplies ``DATABASE_URL`` (PostgreSQL) in production.

Env vars:
- ``DATABASE_URL``     SQLAlchemy URL. Default: SQLite file under ``data/``.
- ``FRONTEND_ORIGIN``  Comma-separated allowed CORS origins. Default ``*`` for demo.
- ``APP_ENV``          ``development`` (default) or ``production``.
- ``SEED_ON_STARTUP``  ``1`` (default) to create tables + seed when empty.
"""
from __future__ import annotations

import os
from pathlib import Path

# repo root = .../Biznoria  (backend/app/config.py -> parents[2])
REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = REPO_ROOT / "data"
# Overridable so tests can use a throwaway, fast-to-generate dataset.
SYNTHETIC_DIR = Path(os.getenv("SYNTHETIC_DIR", str(DATA_DIR / "synthetic")))


def _default_sqlite_url() -> str:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{(DATA_DIR / 'biznoria.db').as_posix()}"


def get_database_url() -> str:
    url = os.getenv("DATABASE_URL", "").strip()
    if not url:
        return _default_sqlite_url()
    # Render historically hands out ``postgres://``; SQLAlchemy 2.x wants ``postgresql://``.
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]
    return url


def get_frontend_origins() -> list[str]:
    raw = os.getenv("FRONTEND_ORIGIN", "*").strip()
    if not raw or raw == "*":
        return ["*"]
    return [o.strip() for o in raw.split(",") if o.strip()]


def get_app_env() -> str:
    return os.getenv("APP_ENV", "development").strip() or "development"


def seed_on_startup() -> bool:
    return os.getenv("SEED_ON_STARTUP", "1").strip() not in {"0", "false", "False"}


# Deterministic synthetic-data parameters (must match scripts/generate_synthetic.py defaults).
SEED_SMES: int = int(os.getenv("SEED_SMES", "50"))
SEED_DAYS: int = int(os.getenv("SEED_DAYS", "365"))
SEED_VALUE: int = int(os.getenv("SEED_SEED", "42"))

DATABASE_URL = get_database_url()
FRONTEND_ORIGINS = get_frontend_origins()
APP_ENV = get_app_env()
