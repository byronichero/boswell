"""Search and tool schemas."""

from pydantic import BaseModel, Field


class ConcordanceHit(BaseModel):
    """Single KWIC line."""

    work_id: int
    work_title: str
    locator: str
    before: str
    keyword: str
    after: str


class ConcordanceResponse(BaseModel):
    """KWIC search results."""

    query: str
    scope_period_ids: list[int]
    hits: list[ConcordanceHit]
    total_hits: int


class KeywordEntry(BaseModel):
    """Term frequency row."""

    term: str
    count: int


class KeywordResponse(BaseModel):
    """Keyword frequency table."""

    scope_period_ids: list[int]
    terms: list[KeywordEntry]


class SemanticHit(BaseModel):
    """Vector hit."""

    score: float
    work_id: int
    work_title: str
    chunk_index: int
    text: str
    locator: str


class SemanticSearchRequest(BaseModel):
    """Semantic search body."""

    query: str = Field(..., min_length=1)
    limit: int = Field(10, ge=1, le=50)
    period_id: int | None = None
    soft_scope: bool = True


class SemanticSearchResponse(BaseModel):
    """Semantic hits."""

    query: str
    scope_period_ids: list[int]
    hits: list[SemanticHit]


class StylisticsLiteResponse(BaseModel):
    """Heuristic stats for a single work."""

    work_id: int
    title: str
    char_count: int
    sentence_count: int
    avg_sentence_length: float
    dialogue_line_markers: int
