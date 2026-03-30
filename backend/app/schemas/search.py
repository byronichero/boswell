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
    """Heuristic stats for a single work (prose-oriented; see field descriptions)."""

    work_id: int
    title: str
    char_count: int
    sentence_count: int
    avg_sentence_length: float = Field(
        ...,
        description=(
            "Mean characters per heuristic sentence (. ? !). Skews for verse or unpunctuated prose."
        ),
    )
    dialogue_line_markers: int
    avg_words_per_sentence: float
    word_count: int
    unique_word_types: int
    type_token_ratio: float
    comma_count: int
    semicolon_count: int
    colon_count: int
    question_mark_count: int
    exclamation_mark_count: int
    dash_em_en_count: int = Field(..., description="Unicode em dash (—) and en dash (–) only.")
    paren_open_count: int
    paren_close_count: int
    comma_per_1k_words: float
    semicolon_per_1k_words: float
    colon_per_1k_words: float
    question_per_1k_words: float
    exclamation_per_1k_words: float


class WorkStylisticsMeta(BaseModel):
    """Context for comparing two works (genre not stored; use period as rough shelf)."""

    work_id: int
    title: str
    author: str
    year: int | None
    period_name: str | None


class StylisticsCompareResponse(BaseModel):
    """Same lite metrics for two works side-by-side for argumentation / teaching."""

    work_a: StylisticsLiteResponse
    work_b: StylisticsLiteResponse
    meta_a: WorkStylisticsMeta
    meta_b: WorkStylisticsMeta


class RollingWordWindowPoint(BaseModel):
    """One sliding word window: local lexical density (TTR) and avg word length."""

    window_index: int
    start_token_index: int
    end_token_index: int
    word_count: int
    type_token_ratio: float
    avg_word_length: float


class RollingSentencePoint(BaseModel):
    """Per heuristic sentence: length and smoothed average (pacing)."""

    sentence_index: int
    words_in_sentence: int
    rolling_avg_words: float


class StylisticsRollingResponse(BaseModel):
    """Word-window TTR series + sentence-length smoothing for one work."""

    work_id: int
    title: str
    author: str
    year: int | None
    period_name: str | None
    window_words: int
    stride_words: int
    sentence_smooth: int
    word_windows: list[RollingWordWindowPoint]
    sentence_series: list[RollingSentencePoint]
    word_windows_truncated: bool
    total_word_tokens: int
    total_sentences: int
