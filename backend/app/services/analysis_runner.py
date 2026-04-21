"""
Orquestador principal del pipeline de análisis.
Coordina: generación de preguntas → consulta LLMs → análisis → persistencia → scores.
"""
import logging
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import (
    Analysis, AnalysisStatus, Business, Question, Response, LLMProvider
)
from app.services.question_generator import generate_all_questions
from app.services.llm_client import query_all_questions, LLMResponse
from app.services.analyzer import analyze_all_responses, compute_global_scores

logger = logging.getLogger(__name__)


async def run_analysis(analysis_id: int, db: AsyncSession) -> None:
    """
    Pipeline completo. Se ejecuta en background.
    Actualiza el estado de Analysis en cada paso.
    """
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    async def update_status(status: AnalysisStatus, error: str | None = None):
        result = await db.execute(select(Analysis).where(Analysis.id == analysis_id))
        analysis = result.scalar_one()
        analysis.status = status
        if error:
            analysis.error_message = error
        if status == AnalysisStatus.completed:
            analysis.completed_at = datetime.utcnow()
        await db.commit()

    try:
        # ── Cargar análisis y negocio ──────────────────────────────────────────
        result = await db.execute(
            select(Analysis)
            .where(Analysis.id == analysis_id)
            .options(selectinload(Analysis.business))
        )
        analysis = result.scalar_one()
        business: Business = analysis.business

        logger.info(f"Starting analysis {analysis_id} for business '{business.name}'")

        # ── Paso 1: Generar preguntas ──────────────────────────────────────────
        await update_status(AnalysisStatus.generating_questions)

        questions_by_category = await generate_all_questions(
            business_name=business.name,
            city=business.city,
            sector=business.sector,
            competitors=business.competitors or [],
        )

        # Persistir preguntas
        all_question_texts: list[str] = []
        question_objects: list[Question] = []

        for category, prompts in questions_by_category.items():
            for prompt in prompts:
                q = Question(analysis_id=analysis_id, category=category, prompt=prompt)
                db.add(q)
                question_objects.append(q)
                all_question_texts.append(prompt)

        await db.commit()

        # Refrescar para obtener IDs
        for q in question_objects:
            await db.refresh(q)

        logger.info(f"Persisted {len(all_question_texts)} questions")

        # ── Paso 2: Consultar ambos LLMs en paralelo ──────────────────────────
        await update_status(AnalysisStatus.querying_llms)

        response_pairs = await query_all_questions(all_question_texts)

        # Flatten: lista de todas las respuestas individuales con referencia a la pregunta
        all_responses: list[tuple[LLMResponse, int]] = []  # (respuesta, question_id)
        for i, (openai_r, gemini_r) in enumerate(response_pairs):
            q_id = question_objects[i].id
            all_responses.append((openai_r, q_id))
            all_responses.append((gemini_r, q_id))

        # ── Paso 3: Analizar métricas ──────────────────────────────────────────
        await update_status(AnalysisStatus.analyzing)

        all_llm_responses = [r for r, _ in all_responses]
        analyzed = await analyze_all_responses(
            llm_responses=all_llm_responses,
            business_name=business.name,
            competitors=business.competitors or [],
        )

        # ── Paso 4: Persistir respuestas con métricas ─────────────────────────
        for i, (llm_response, metrics) in enumerate(analyzed):
            _, q_id = all_responses[i]
            resp = Response(
                question_id=q_id,
                llm_provider=llm_response.provider,
                raw_response=llm_response.raw_response,
                tokens_used=llm_response.tokens_used,
                response_time_ms=llm_response.response_time_ms,
                sentiment=metrics.sentiment,
                is_mentioned=metrics.is_mentioned,
                ranking_position=metrics.ranking_position,
                accuracy=metrics.accuracy,
                has_hallucination=metrics.has_hallucination,
                intent=metrics.intent,
                confidence=metrics.confidence,
                topics=metrics.topics,
                competitor_mentions=metrics.competitor_mentions,
            )
            db.add(resp)

        await db.commit()
        logger.info(f"Persisted {len(analyzed)} responses with metrics")

        # ── Paso 5: Calcular y persistir scores globales ──────────────────────
        global_scores = compute_global_scores(analyzed)

        result = await db.execute(select(Analysis).where(Analysis.id == analysis_id))
        analysis = result.scalar_one()

        for key, value in global_scores.items():
            setattr(analysis, key, value)

        await update_status(AnalysisStatus.completed)
        logger.info(f"Analysis {analysis_id} completed. Total score: {global_scores.get('total_score')}")

    except Exception as e:
        logger.exception(f"Analysis {analysis_id} failed: {e}")
        await update_status(AnalysisStatus.failed, error=str(e))
        raise
