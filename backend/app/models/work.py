"""Work (text) model."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.period import Period


class Work(Base):
    """A single literary work with full text in Postgres for KWIC and tools."""

    __tablename__ = "works"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(512), index=True)
    author: Mapped[str] = mapped_column(String(512), default="", index=True)
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    content: Mapped[str] = mapped_column(Text)
    period_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("periods.id"), nullable=True)

    period: Mapped[Period | None] = relationship("Period", back_populates="works")
