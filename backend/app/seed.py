"""Deterministic seed loader (idempotent).

Pipeline
--------
1. Load ``data/synthetic/{smes,transactions}.csv``; if absent, call the ML
   lane's ``scripts/generate_synthetic.py`` (seeded RNG) and cache the output.
2. Overlay the five canonical fixtures from PRD §9 onto the first five SMEs so
   the judge demo has a predictable story on every device.
3. Materialise individual CREDIT/DEBIT transactions (PRD §8.2 conventions).
4. Create accounts + consents, and seed external rows only for active consents.

Synthetic data only. No real credentials, no real banking data.
"""
from __future__ import annotations

import importlib.util
import sys
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from sqlalchemy import insert, select
from sqlalchemy.orm import Session

from .config import REPO_ROOT, SEED_DAYS, SEED_SMES, SEED_VALUE, SYNTHETIC_DIR
from .models import (
    Account,
    AccountSource,
    ApplicationStatus,
    Consent,
    LoanApplication,
    Recommendation,
    SME,
    Transaction,
    TxCategory,
    TxSource,
)

# --------------------------------------------------------------------------- #
# PRD §9 canonical fixtures — fixed IDs, fixed behaviours, judge-friendly story.
# --------------------------------------------------------------------------- #
FIXTURES: list[dict] = [
    {
        "id": "ADE_FASHION_001",
        "name": "Ade's Fashion Store",
        "sector": "fashion",
        "size_band": "small",
        "region": "lagos",
        "archetype": "growing",
        "consent": "active",
        "institution": "GTBank",
    },
    {
        "id": "TOLA_PHARMACY_002",
        "name": "Tola Pharmacy",
        "sector": "retail",
        "size_band": "small",
        "region": "lagos",
        "archetype": "stable",
        "consent": "active",
        "institution": "Zenith Bank",
    },
    {
        "id": "LAGOS_BISTRO_003",
        "name": "Lagos Bistro",
        "sector": "food",
        "size_band": "micro",
        "region": "lagos",
        "archetype": "volatile",
        "consent": "expired",
        "institution": "Access Bank",
    },
    {
        "id": "KANO_ELECTRONICS_004",
        "name": "Kano Electronics",
        "sector": "tech-services",
        "size_band": "small",
        "region": "kano",
        "archetype": "irregular",
        "consent": "revoked",
        "institution": "UBA",
    },
    {
        "id": "MART_DECLINE_005",
        "name": "Marina Mart",
        "sector": "retail",
        "size_band": "medium",
        "region": "abuja",
        "archetype": "declining",
        "consent": "none",
        "institution": None,
    },
]

INFLOW_CATEGORIES = [TxCategory.SALES, TxCategory.TRANSFER, TxCategory.OTHER]
INFLOW_PROBS = [0.80, 0.12, 0.08]
OUTFLOW_CATEGORIES = [
    TxCategory.SUPPLIER,
    TxCategory.PAYROLL,
    TxCategory.RENT,
    TxCategory.UTILITIES,
    TxCategory.TRANSFER,
    TxCategory.CASH_WITHDRAWAL,
    TxCategory.LOAN_REPAYMENT,
]
OUTFLOW_PROBS = [0.40, 0.15, 0.08, 0.10, 0.12, 0.08, 0.07]

READ_SCOPES = ["accounts:read", "transactions:read"]

# --------------------------------------------------------------------------- #
# Display names for the non-fixture SMEs.
#
# The ML generator names its rows "SME 001".."SME 050" (a fixture label, not a
# business name). The five PRD §9 fixtures get real names from FIXTURES above;
# the remaining portfolio gets a deterministic, sector-appropriate Nigerian
# business name so the demo reads as a real portfolio rather than placeholder
# rows. Purely presentational — no schema or contract change.
# --------------------------------------------------------------------------- #
_FIRST_NAMES = (
    "Adebayo", "Chidinma", "Emeka", "Fatima", "Ngozi", "Tunde", "Yemi", "Ibrahim",
    "Amaka", "Segun", "Blessing", "Kelechi", "Aisha", "Obinna", "Funke", "Musa",
    "Chiamaka", "Damilola", "Uche", "Halima", "Babatunde", "Ifeoma", "Sani",
    "Adaeze", "Gbenga", "Zainab", "Chinedu", "Yetunde", "Aliyu", "Nkechi",
)

_SECTOR_NOUNS: dict[str, tuple[str, ...]] = {
    "fashion": ("Fashion House", "Textiles", "Styles", "Apparel"),
    "retail": ("Stores", "Supermarket", "Trading", "Mart"),
    "food": ("Kitchen", "Restaurant", "Foods", "Catering"),
    "tech-services": ("Technologies", "Digital", "Systems", "Solutions"),
    "logistics": ("Logistics", "Haulage", "Transport", "Freight"),
    "agro": ("Agro", "Farms", "Produce", "Agro-Allied"),
}


def _business_name(index: int, sector: str) -> str:
    """Deterministic, unique, sector-appropriate display name.

    ``index % 30`` picks the first name and ``(index * 3) % 4`` the noun; the
    pair can only repeat after 60 indices, so a 50-SME portfolio is collision-free
    while still varying the noun rather than repeating one per sector.
    """
    first = _FIRST_NAMES[index % len(_FIRST_NAMES)]
    nouns = _SECTOR_NOUNS.get(sector, ("Enterprises", "Ventures", "Company"))
    noun = nouns[(index * 3) % len(nouns)]
    return f"{first} {noun}"


# --------------------------------------------------------------------------- #
# Step 1 — load or generate the raw daily series
# --------------------------------------------------------------------------- #
def _load_generator_module():
    path = REPO_ROOT / "scripts" / "generate_synthetic.py"
    if not path.is_file():
        raise FileNotFoundError(f"synthetic generator not found at {path}")
    spec = importlib.util.spec_from_file_location("biznoria_generate_synthetic", path)
    if spec is None or spec.loader is None:
        raise ImportError("could not load scripts/generate_synthetic.py")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def load_or_generate_frames() -> tuple[pd.DataFrame, pd.DataFrame]:
    smes_path = SYNTHETIC_DIR / "smes.csv"
    txs_path = SYNTHETIC_DIR / "transactions.csv"
    if smes_path.is_file() and txs_path.is_file():
        return pd.read_csv(smes_path), pd.read_csv(txs_path)

    module = _load_generator_module()
    smes, txs = module.generate(SEED_SMES, SEED_DAYS, SEED_VALUE)
    SYNTHETIC_DIR.mkdir(parents=True, exist_ok=True)
    smes.to_csv(smes_path, index=False)
    txs.to_csv(txs_path, index=False)
    return smes, txs


# --------------------------------------------------------------------------- #
# Step 2 — fixture overlay (behaviour archetypes from PRD §9)
# --------------------------------------------------------------------------- #
def reshape_series(df: pd.DataFrame, archetype: str, rng: np.random.Generator) -> pd.DataFrame:
    """Synthesise a daily series that delivers a PRD §9 behaviour story.

    The series is rebuilt around the generator's own per-SME mean inflow/outflow
    so a fixture still sits at the same scale as the rest of the portfolio, but
    the shape (trend, seasonality, volatility) is fully controlled here. That
    control is the point of the fixture overlay: the judge must see the same
    story on every device.
    """
    df = df.sort_values("date").reset_index(drop=True)
    n = len(df)
    if n == 0:
        return df

    t = np.arange(n) / max(n - 1, 1)
    dates = pd.to_datetime(df["date"])
    dow = dates.dt.dayofweek.to_numpy()
    dom = dates.dt.day.to_numpy()
    weekly = np.sin(2.0 * np.pi * dow / 7.0)
    eom = (dom >= 28).astype(float)

    inflow_mean = float(df["inflow"].mean()) or 1.0
    outflow_mean = float(df["outflow"].mean()) or 1.0

    if archetype == "growing":  # rising revenue, seasonal spikes, stable supplier cycle
        inflow = inflow_mean * (0.95 + 0.80 * t) * (1 + 0.05 * weekly + 0.06 * eom)
        inflow = inflow * (1 + 0.02 * rng.normal(0, 1, n))
        outflow = outflow_mean * (0.92 + 0.28 * t) * (1 + 0.02 * rng.normal(0, 1, n))
    elif archetype == "stable":  # steady recurring inflows and outflows
        inflow = inflow_mean * (1 + 0.04 * weekly + 0.05 * eom)
        inflow = inflow * (1 + 0.015 * rng.normal(0, 1, n))
        outflow = outflow_mean * (1 + 0.015 * rng.normal(0, 1, n))
    elif archetype == "volatile":  # high frequency, weekend spikes
        inflow = inflow_mean * (1 + 0.55 * weekly + 0.35 * eom)
        inflow = inflow * (1 + 0.65 * rng.normal(0, 1, n))
        outflow = outflow_mean * (1 + 0.55 * rng.normal(0, 1, n))
    elif archetype == "irregular":  # large but irregular payments
        every = 5
        mask = np.arange(n) % every == 0
        lump = inflow_mean * every * rng.uniform(0.30, 1.80, n)
        inflow = np.where(mask, lump, inflow_mean * 0.75)
        outflow = outflow_mean * 0.60 * (1 + 0.06 * rng.normal(0, 1, n))
    elif archetype == "declining":  # falling inflows, rising expenses
        inflow = inflow_mean * (1.20 - 0.70 * t) * (1 + 0.05 * rng.normal(0, 1, n))
        outflow = outflow_mean * (1.00 + 0.60 * t) * (1 + 0.03 * rng.normal(0, 1, n))
    else:
        inflow = df["inflow"].to_numpy(dtype=float)
        outflow = df["outflow"].to_numpy(dtype=float)

    return pd.DataFrame(
        {
            "date": df["date"],
            "inflow": np.round(np.clip(inflow, 0.0, None), 2),
            "outflow": np.round(np.clip(outflow, 0.0, None), 2),
        }
    )


# --------------------------------------------------------------------------- #
# Step 3 — materialise transactions
# --------------------------------------------------------------------------- #
def _materialise(
    sme_id: str,
    account_id: str,
    series: pd.DataFrame,
    source: str,
    rng: np.random.Generator,
    scale: float = 1.0,
) -> list[dict]:
    rows: list[dict] = []
    for row in series.itertuples(index=False):
        d: date = row.date
        inflow = float(row.inflow) * scale
        outflow = float(row.outflow) * scale
        if inflow > 0:
            cat = INFLOW_CATEGORIES[int(rng.choice(len(INFLOW_CATEGORIES), p=INFLOW_PROBS))]
            rows.append(
                {
                    "sme_id": sme_id,
                    "account_id": account_id,
                    "date": d,
                    "amount": round(inflow, 2),
                    "direction": "CREDIT",
                    "category": cat.value,
                    "channel": "transfer",
                    "source": source,
                }
            )
        if outflow > 0:
            cat = OUTFLOW_CATEGORIES[int(rng.choice(len(OUTFLOW_CATEGORIES), p=OUTFLOW_PROBS))]
            rows.append(
                {
                    "sme_id": sme_id,
                    "account_id": account_id,
                    "date": d,
                    "amount": round(outflow, 2),
                    "direction": "DEBIT",
                    "category": cat.value,
                    "channel": "transfer",
                    "source": source,
                }
            )
    return rows


def _last4(index: int) -> str:
    return f"{1000 + index:04d}"


# --------------------------------------------------------------------------- #
# Public API
# --------------------------------------------------------------------------- #
def is_seeded(db: Session) -> bool:
    return db.execute(select(SME.id).limit(1)).scalar_one_or_none() is not None


def seed_database(db: Session) -> dict:
    """Create the full synthetic dataset. Idempotent: no-op if already seeded."""
    if is_seeded(db):
        return {"seeded": False, "reason": "database already contains SMEs"}

    smes_df, txs_df = load_or_generate_frames()
    txs_df = txs_df.copy()
    txs_df["date"] = pd.to_datetime(txs_df["date"]).dt.date

    generated_ids = list(smes_df["id"].astype(str))
    fixture_by_source = {generated_ids[i]: FIXTURES[i] for i in range(min(5, len(generated_ids)))}
    anchor: date = max(txs_df["date"])

    sme_rows: list[dict] = []
    account_rows: list[dict] = []
    consent_rows: list[dict] = []
    tx_rows: list[dict] = []

    for index, row in enumerate(smes_df.itertuples(index=False)):
        source_id = str(row.id)
        fixture = fixture_by_source.get(source_id)

        sme_id = fixture["id"] if fixture else source_id
        sector = fixture["sector"] if fixture else str(row.sector)
        name = fixture["name"] if fixture else _business_name(index, sector)
        size_band = fixture["size_band"] if fixture else str(row.size_band)
        region = fixture["region"] if fixture else str(row.region)
        joined_on = row.joined_on
        if not isinstance(joined_on, date):
            joined_on = pd.to_datetime(joined_on).date()

        sme_rows.append(
            {
                "id": sme_id,
                "name": name,
                "sector": sector,
                "size_band": size_band,
                "region": region,
                "joined_on": joined_on,
            }
        )

        rng = np.random.default_rng(SEED_VALUE + index)

        wema_account_id = f"acc_wema_{sme_id}"
        account_rows.append(
            {
                "id": wema_account_id,
                "sme_id": sme_id,
                "provider": "wema",
                "label": f"Wema Current ****{_last4(index)}",
                "institution_name": "Wema Bank",
                "account_type": "current",
                "masked_account": f"****{_last4(index)}",
                "is_primary": True,
                "consent_id": None,
                "consent_expires_at": None,
                "source": AccountSource.INTERNAL.value,
            }
        )

        series = txs_df[txs_df["sme_id"] == source_id][["date", "inflow", "outflow"]]
        if fixture:
            series = reshape_series(series, fixture["archetype"], rng)
        tx_rows.extend(
            _materialise(sme_id, wema_account_id, series, TxSource.WEMA.value, rng)
        )

        if not fixture or fixture["consent"] == "none":
            continue

        state = fixture["consent"]
        if state == "active":
            granted, expires, revoked = anchor - timedelta(days=10), anchor + timedelta(days=30), None
        elif state == "expired":
            granted, expires, revoked = anchor - timedelta(days=120), anchor - timedelta(days=20), None
        else:  # revoked
            granted, expires, revoked = anchor - timedelta(days=60), anchor + timedelta(days=30), anchor - timedelta(days=5)

        consent_id = f"cons_{sme_id}_001"
        consent_rows.append(
            {
                "id": consent_id,
                "sme_id": sme_id,
                "provider": "external_mock",
                "scopes": READ_SCOPES,
                "granted_at": _utc(granted),
                "expires_at": _utc(expires),
                "revoked_at": None if revoked is None else _utc(revoked),
            }
        )

        ext_account_id = f"acc_ext_{sme_id}"
        account_rows.append(
            {
                "id": ext_account_id,
                "sme_id": sme_id,
                "provider": "external_mock",
                "label": f"External Current ****{_last4(index + 500)}",
                "institution_name": fixture["institution"] or "External Bank",
                "account_type": "current",
                "masked_account": f"****{_last4(index + 500)}",
                "is_primary": False,
                "consent_id": consent_id,
                "consent_expires_at": _utc(expires),
                "source": AccountSource.AUTHORISED_EXTERNAL.value,
            }
        )

        # Only an ACTIVE consent yields external rows (PRD non-negotiable #2).
        if state == "active":
            tx_rows.extend(
                _materialise(
                    sme_id,
                    ext_account_id,
                    series,
                    TxSource.EXTERNAL.value,
                    rng,
                    scale=0.3,
                )
            )

    db.execute(insert(SME), sme_rows)
    db.execute(insert(Account), account_rows)
    if consent_rows:
        db.execute(insert(Consent), consent_rows)
    _bulk_insert_transactions(db, tx_rows)

    application_rows = _seed_applications(sme_rows, anchor)
    if application_rows:
        db.execute(insert(LoanApplication), application_rows)
    db.commit()

    return {
        "seeded": True,
        "smes": len(sme_rows),
        "accounts": len(account_rows),
        "consents": len(consent_rows),
        "transactions": len(tx_rows),
        "applications": len(application_rows),
        "anchor_date": anchor.isoformat(),
    }


def _bulk_insert_transactions(db: Session, rows: list[dict], chunk: int = 5000) -> None:
    for start in range(0, len(rows), chunk):
        db.execute(insert(Transaction), rows[start : start + chunk])


# --------------------------------------------------------------------------- #
# Seeded facility requests.
#
# Deliberately drawn from NON-fixture businesses (index >= 5) so the five PRD §9
# demo fixtures stay application-free — the demo can submit one live from
# Ade's Fashion Store and watch it land in the officer's queue.
# --------------------------------------------------------------------------- #
_SEED_APPLICATIONS: tuple[dict, ...] = (
    {
        "sme_index": 6,
        "amount": 3_500_000,
        "rate": 0.22,
        "term": 18,
        "purpose": "Additional delivery van for the Lagos route",
        "status": ApplicationStatus.SUBMITTED.value,
        "days_ago": 2,
    },
    {
        "sme_index": 9,
        "amount": 1_200_000,
        "rate": 0.24,
        "term": 12,
        "purpose": "Festive-season stock build-up",
        "status": ApplicationStatus.UNDER_REVIEW.value,
        "days_ago": 6,
    },
    {
        "sme_index": 11,
        "amount": 8_000_000,
        "rate": 0.19,
        "term": 36,
        "purpose": "Fit-out for a second outlet",
        "status": ApplicationStatus.RECOMMENDATION_RECORDED.value,
        "days_ago": 14,
        "recommendation": Recommendation.RECOMMEND_FOR_REVIEW.value,
        "note": "Stable inflows and a comfortable forecast cushion over 90 days.",
    },
)


def _seed_applications(sme_rows: list[dict], anchor: date) -> list[dict]:
    rows: list[dict] = []
    for i, spec in enumerate(_SEED_APPLICATIONS, start=1):
        idx = int(spec["sme_index"])
        if idx >= len(sme_rows):
            continue
        submitted = datetime.combine(
            anchor - timedelta(days=int(spec["days_ago"])), time.min, tzinfo=timezone.utc
        )
        recorded = spec.get("recommendation") is not None
        rows.append(
            {
                "id": f"APP-{i:04d}",
                "sme_id": sme_rows[idx]["id"],
                "amount": float(spec["amount"]),
                "annual_rate": float(spec["rate"]),
                "term_months": int(spec["term"]),
                "purpose": str(spec["purpose"]),
                "status": str(spec["status"]),
                "submitted_at": submitted,
                "recommendation": spec.get("recommendation"),
                "recommendation_note": spec.get("note"),
                "recommendation_at": submitted + timedelta(days=1) if recorded else None,
                "reviewed_by": "officer" if recorded else None,
            }
        )
    return rows


def _utc(d: date) -> datetime:
    return datetime(d.year, d.month, d.day, tzinfo=timezone.utc)


def seed_fixture_ids() -> list[str]:
    return [f["id"] for f in FIXTURES]
