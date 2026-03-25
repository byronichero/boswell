"""Evidence tray persistence."""

import uuid

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class EvidenceTray(Base):
    """A tray holding excerpts for synthesis (MVP: one tray per UUID)."""

    __tablename__ = "evidence_trays"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    label: Mapped[str | None] = mapped_column(String(255), nullable=True)

    items: Mapped[list["TrayItem"]] = relationship(
        "TrayItem",
        back_populates="tray",
        order_by="TrayItem.sort_order",
        cascade="all, delete-orphan",
    )


class TrayItem(Base):
    """Single excerpt with stable id for [T#] citations."""

    __tablename__ = "tray_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    tray_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("evidence_trays.id", ondelete="CASCADE"),
        index=True,
    )
    work_id: Mapped[int] = mapped_column(Integer, ForeignKey("works.id"), index=True)
    locator: Mapped[str] = mapped_column(String(512), default="")
    excerpt: Mapped[str] = mapped_column(Text)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    tray: Mapped["EvidenceTray"] = relationship("EvidenceTray", back_populates="items")
