"""
Endpoint para sugerir preguntas personalizadas según el tipo de negocio.
La IA genera propuestas que el usuario puede seleccionar, editar o completar
antes de lanzar el análisis.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.models import Business
from app.models.schemas import QuestionSuggestResponse, CategorySuggestions
from app.services.question_generator import generate_all_questions

logger = logging.getLogger(__name__)
router = APIRouter()


class SuggestRequest:
    pass


from pydantic import BaseModel

class QuestionSuggestRequest(BaseModel):
    business_id: int


@router.post("/suggest", response_model=QuestionSuggestResponse)
async def suggest_questions(
    data: QuestionSuggestRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Genera preguntas personalizadas para el negocio usando IA.
    Las preguntas NO se persisten — el usuario las revisa y selecciona
    antes de lanzar el análisis vía POST /api/analyses.
    """
    result = await db.execute(select(Business).where(Business.id == data.business_id))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    logger.info(f"Generating question suggestions for business '{business.name}'")

    questions_by_category = await generate_all_questions(
        business_name=business.name,
        city=business.city,
        sector=business.sector,
        competitors=business.competitors or [],
    )

    suggestions = [
        CategorySuggestions(category=cat, questions=qs)
        for cat, qs in questions_by_category.items()
        if qs
    ]

    return QuestionSuggestResponse(
        business_id=data.business_id,
        suggestions=suggestions,
    )
