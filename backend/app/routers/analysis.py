"""Synthesis and stored analyses."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.analysis import SynthesizeRequest, SynthesizeResponse
from app.services.synthesis import synthesize_from_tray

router = APIRouter()


@router.post("/synthesize", response_model=SynthesizeResponse)
async def synthesize(
    body: SynthesizeRequest,
    db: Session = Depends(get_db),
) -> SynthesizeResponse:
    """Generate grounded analysis from the evidence tray."""
    try:
        content, aid = await synthesize_from_tray(
            db,
            tray_id=body.tray_id,
            question=body.question,
            chat_model=body.model,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Synthesis failed: {e!s}") from e
    return SynthesizeResponse(
        content=content,
        analysis_id=aid,
        tray_id=str(body.tray_id),
    )


@router.get("/{analysis_id}")
def get_analysis(analysis_id: int, db: Session = Depends(get_db)) -> dict[str, str | int | None]:
    """Fetch a saved analysis row."""
    from app.models.analysis import Analysis

    row = db.get(Analysis, analysis_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return {
        "id": row.id,
        "analysis_type": row.analysis_type,
        "title": row.title,
        "content": row.content,
        "period_id": row.period_id,
        "tray_id": row.tray_id,
    }
