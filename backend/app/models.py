"""SQLAlchemy 2.x ORM models.

Logical model per docs/ARCHITECTURE.md:
    smes, transactions, accounts, consents

Conventions per PRD §8.2 (these MUST NOT drift):
- amounts are numeric NGN
- transaction ``direction`` is exactly ``CREDIT`` or ``DEBIT``
- ``category`` is one controlled enum
- ``source`` distinguishes internal (``wema``) from authorised-external
  (``external``) data; external rows are only ever served when a valid,
  unexpired, unrevoked consent exists.
"""
from __future__ import annotations

import enum
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    JSON,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Direction(str, enum.Enum):
    CREDIT = "CREDIT"
    DEBIT = "DEBIT"


class TxSource(str, enum.Enum):
    WEMA = "wema"
    EXTERNAL = "external"


class TxCategory(str, enum.Enum):
    SALES = "sales"
    SUPPLIER = "supplier"
    PAYROLL = "payroll"
    RENT = "rent"
    UTILITIES = "utilities"
    TRANSFER = "transfer"
    LOAN_REPAYMENT = "loan_repayment"
    CASH_WITHDRAWAL = "cash_withdrawal"
    OTHER = "other"


class AccountSource(str, enum.Enum):
    INTERNAL = "internal"
    AUTHORISED_EXTERNAL = "authorised_external"


class ConsentStatus(str, enum.Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"
    NOT_CONNECTED = "not_connected"


class SME(Base):
    __tablename__ = "smes"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    sector: Mapped[str] = mapped_column(String(64), nullable=False)
    size_band: Mapped[str] = mapped_column(String(32), nullable=False)
    region: Mapped[str] = mapped_column(String(64), nullable=False)
    joined_on: Mapped[date] = mapped_column(Date, nullable=False)

    accounts: Mapped[list["Account"]] = relationship(back_populates="sme", cascade="all, delete-orphan")
    transactions: Mapped[list["Transaction"]] = relationship(
        back_populates="sme", cascade="all, delete-orphan"
    )


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[str] = mapped_column(String(96), primary_key=True)
    sme_id: Mapped[str] = mapped_column(ForeignKey("smes.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String(32), nullable=False)  # wema | external_mock
    label: Mapped[str] = mapped_column(String(160), nullable=False)
    institution_name: Mapped[str] = mapped_column(String(120), nullable=False)
    account_type: Mapped[str] = mapped_column(String(48), nullable=False, default="current")
    masked_account: Mapped[str] = mapped_column(String(48), nullable=False, default="****0000")
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    consent_id: Mapped[str | None] = mapped_column(String(96), nullable=True)
    consent_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    source: Mapped[str] = mapped_column(String(32), nullable=False)  # internal | authorised_external

    sme: Mapped["SME"] = relationship(back_populates="accounts")


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    sme_id: Mapped[str] = mapped_column(ForeignKey("smes.id", ondelete="CASCADE"), index=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id", ondelete="CASCADE"), index=True)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    direction: Mapped[str] = mapped_column(String(8), nullable=False)  # CREDIT | DEBIT
    category: Mapped[str] = mapped_column(String(32), nullable=False, default=TxCategory.OTHER.value)
    channel: Mapped[str] = mapped_column(String(32), nullable=False, default="transfer")
    source: Mapped[str] = mapped_column(String(16), nullable=False)  # wema | external

    sme: Mapped["SME"] = relationship(back_populates="transactions")

    __table_args__ = (Index("ix_transactions_sme_date", "sme_id", "date"),)


class Consent(Base):
    __tablename__ = "consents"

    id: Mapped[str] = mapped_column(String(96), primary_key=True)
    sme_id: Mapped[str] = mapped_column(ForeignKey("smes.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String(32), nullable=False, default="external_mock")
    scopes: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    granted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
