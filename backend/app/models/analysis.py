"""Stored synthesis / analysis records."""

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Analysis(Base):
    """Persisted LLM output from synthesis or other generators."""

    __tablename__ = "analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    analysis_type: Mapped[str] = mapped_column(String(64), index=True, default="synthesis")
    title: Mapped[str] = mapped_column(String(512), default="")
    content: Mapped[str] = mapped_column(Text)
    period_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("periods.id"), nullable=True)
    tray_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
