"""Period schemas."""

from pydantic import BaseModel, ConfigDict


class PeriodRead(BaseModel):
    """Serialized period for API responses."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    start_year: int
    end_year: int


class ScopeInfo(BaseModel):
    """Explains which periods are included for soft scoping."""

    mode: str
    center_period_id: int | None
    included_period_ids: list[int]
    included_period_names: list[str]
