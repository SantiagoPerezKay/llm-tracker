import logging
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.core.database import get_db, AsyncSessionLocal
from app.models.models import Analysis, Business, AnalysisStatus, Question, LLMProvider
from app.models.schemas import (
    AnalysisCreate, AnalysisOut, AnalysisSummary,
    MetricsDashboard, ResponsesPayload, ComparePayload,
    QuestionComparison, ResponseOut, BusinessOut, TokenUsage,
)
from app.services.metrics import compute_llm_metrics, generate_recommendations

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/spending")
async def get_spending(db: AsyncSession = Depends(get_db)):
    """Devuelve el gasto total acumulado de todos los análisis completados."""
    result = await db.execute(
        select(
            func.coalesce(func.sum(Analysis.total_cost_usd), 0.0),
            func.coalesce(func.sum(Analysis.total_tokens_used), 0),
            func.count(Analysis.id),
        ).where(Analysis.status == AnalysisStatus.completed)
    )
    total_cost, total_tokens, total_analyses = result.one()
    return {
        "total_cost_usd": round(float(total_cost), 6),
        "total_tokens": int(total_tokens),
        "total_analyses": int(total_analyses),
    }


async def run_analysis_background(
    analysis_id: int,
    preselected_questions: list[dict] | None = None,
):
    """Wrapper para ejecutar el análisis en background con su propia sesión de DB."""
    from app.services.analysis_runner import run_analysis
    async with AsyncSessionLocal() as db:
        await run_analysis(
            analysis_id=analysis_id,
            db=db,
            preselected_questions=preselected_questions,
        )


# ── CRUD básico ───────────────────────────────────────────

@router.post("", response_model=AnalysisSummary, status_code=202)
async def create_analysis(
    data: AnalysisCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Crea un análisis y lo lanza en background.
    Si se envían preguntas pre-seleccionadas, se usan directamente (salteando la generación IA).
    El frontend hace polling a GET /analyses/{id}/status para ver el progreso.
    """
    result = await db.execute(select(Business).where(Business.id == data.business_id))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    analysis = Analysis(business_id=data.business_id, status=AnalysisStatus.pending)
    db.add(analysis)
    await db.commit()
    await db.refresh(analysis)

    # Convertir QuestionInput a dicts serializables para el background task
    preselected = (
        [{"category": q.category, "prompt": q.prompt} for q in data.questions]
        if data.questions
        else None
    )

    background_tasks.add_task(run_analysis_background, analysis.id, preselected)

    logger.info(
        f"Analysis {analysis.id} created for business '{business.name}' "
        f"({'manual questions' if preselected else 'auto-generate'})"
    )
    return analysis


@router.get("/business/{business_id}", response_model=list[AnalysisSummary])
async def list_analyses_for_business(
    business_id: int, db: AsyncSession = Depends(get_db)
):
    """Lista todos los análisis de un negocio (orden cronológico inverso)."""
    result = await db.execute(
        select(Analysis)
        .where(Analysis.business_id == business_id)
        .order_by(Analysis.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{analysis_id}/status")
async def get_analysis_status(analysis_id: int, db: AsyncSession = Depends(get_db)):
    """Endpoint liviano para polling del estado durante el análisis."""
    result = await db.execute(
        select(Analysis.id, Analysis.status, Analysis.total_score, Analysis.error_message)
        .where(Analysis.id == analysis_id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Analysis not found")

    return {
        "id": row.id,
        "status": row.status,
        "total_score": row.total_score,
        "error_message": row.error_message,
    }


@router.get("/{analysis_id}", response_model=AnalysisOut)
async def get_analysis(analysis_id: int, db: AsyncSession = Depends(get_db)):
    """Devuelve el análisis completo con preguntas y respuestas."""
    result = await db.execute(
        select(Analysis)
        .where(Analysis.id == analysis_id)
        .options(
            selectinload(Analysis.business),
            selectinload(Analysis.questions).selectinload(Question.responses),
        )
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis


# ── Endpoints de resultados ───────────────────────────────

@router.get("/{analysis_id}/metrics", response_model=MetricsDashboard)
async def get_analysis_metrics(analysis_id: int, db: AsyncSession = Depends(get_db)):
    """
    Métricas agregadas del análisis: scores globales, desglose por LLM,
    topic cloud, alertas y recomendaciones accionables.
    """
    result = await db.execute(
        select(Analysis)
        .where(Analysis.id == analysis_id)
        .options(
            selectinload(Analysis.business),
            selectinload(Analysis.questions).selectinload(Question.responses),
        )
    )
    analysis = result.scalar_one_or_none()

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    if analysis.status != AnalysisStatus.completed:
        raise HTTPException(
            status_code=409,
            detail=f"Analysis is not completed yet. Current status: {analysis.status}",
        )

    all_responses = [r for q in analysis.questions for r in q.responses]

    openai_metrics = compute_llm_metrics(LLMProvider.openai, all_responses)
    gemini_metrics = compute_llm_metrics(LLMProvider.gemini, all_responses)

    global_scores = {
        "total_score": analysis.total_score,
        "sentiment_score": analysis.sentiment_score,
        "visibility_score": analysis.visibility_score,
        "recommendation_rate": analysis.recommendation_rate,
        "accuracy_score": analysis.accuracy_score,
        "hallucination_rate": analysis.hallucination_rate,
        "knowledge_depth": analysis.knowledge_depth,
        "llm_consistency": analysis.llm_consistency,
    }

    all_topics: list[str] = []
    for r in all_responses:
        all_topics.extend(r.topics or [])
    top_topics = [t for t, _ in Counter(all_topics).most_common(15)]

    all_competitors: list[str] = []
    for r in all_responses:
        all_competitors.extend(r.competitor_mentions or [])

    recommendations = generate_recommendations(
        global_scores,
        [openai_metrics, gemini_metrics],
        analysis.business.name,
    )

    # Resumen de tokens y costo por proveedor
    from app.models.models import LLMProvider as LP
    token_breakdown = []
    for provider in [LP.openai, LP.gemini]:
        provider_responses = [r for r in all_responses if r.llm_provider == provider]
        tokens = sum((r.tokens_used or 0) for r in provider_responses)
        cost = sum((r.cost_usd or 0.0) for r in provider_responses)
        token_breakdown.append({
            "provider": provider.value,
            "tokens": tokens,
            "cost_usd": round(cost, 8),
        })

    token_usage = TokenUsage(
        total_tokens=analysis.total_tokens_used,
        total_cost_usd=analysis.total_cost_usd,
        llm_breakdown=token_breakdown,
    )

    return MetricsDashboard(
        analysis_id=analysis_id,
        business=BusinessOut.model_validate(analysis.business),
        total_questions=len(analysis.questions),
        global_scores=global_scores,
        by_llm=[openai_metrics, gemini_metrics],
        top_topics=top_topics,
        all_competitor_mentions=list(set(all_competitors)),
        recommendations=recommendations,
        token_usage=token_usage,
    )


@router.get("/{analysis_id}/responses", response_model=ResponsesPayload)
async def get_analysis_responses(analysis_id: int, db: AsyncSession = Depends(get_db)):
    """
    Respuestas crudas de cada LLM por pregunta, con sus métricas individuales.
    Útil para revisar qué dijo exactamente cada LLM.
    """
    result = await db.execute(
        select(Analysis)
        .where(Analysis.id == analysis_id)
        .options(
            selectinload(Analysis.questions).selectinload(Question.responses),
        )
    )
    analysis = result.scalar_one_or_none()

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    if analysis.status not in (AnalysisStatus.completed, AnalysisStatus.analyzing):
        raise HTTPException(
            status_code=409,
            detail=f"No responses available yet. Current status: {analysis.status}",
        )

    total_responses = sum(len(q.responses) for q in analysis.questions)

    return ResponsesPayload(
        analysis_id=analysis_id,
        total_questions=len(analysis.questions),
        total_responses=total_responses,
        questions=analysis.questions,
    )


@router.get("/{analysis_id}/compare", response_model=ComparePayload)
async def get_analysis_compare(analysis_id: int, db: AsyncSession = Depends(get_db)):
    """
    Comparativa lado a lado de ChatGPT vs Gemini para cada pregunta.
    Incluye métricas agregadas por proveedor para ver divergencias.
    """
    result = await db.execute(
        select(Analysis)
        .where(Analysis.id == analysis_id)
        .options(
            selectinload(Analysis.questions).selectinload(Question.responses),
        )
    )
    analysis = result.scalar_one_or_none()

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    if analysis.status != AnalysisStatus.completed:
        raise HTTPException(
            status_code=409,
            detail=f"Analysis is not completed yet. Current status: {analysis.status}",
        )

    all_responses = [r for q in analysis.questions for r in q.responses]
    openai_metrics = compute_llm_metrics(LLMProvider.openai, all_responses)
    gemini_metrics = compute_llm_metrics(LLMProvider.gemini, all_responses)

    comparisons: list[QuestionComparison] = []
    for question in analysis.questions:
        responses_by_provider = {r.llm_provider: r for r in question.responses}
        comparisons.append(
            QuestionComparison(
                question_id=question.id,
                question_text=question.prompt,
                category=question.category,
                openai=ResponseOut.model_validate(responses_by_provider[LLMProvider.openai])
                if LLMProvider.openai in responses_by_provider else None,
                gemini=ResponseOut.model_validate(responses_by_provider[LLMProvider.gemini])
                if LLMProvider.gemini in responses_by_provider else None,
            )
        )

    return ComparePayload(
        analysis_id=analysis_id,
        openai_metrics=openai_metrics,
        gemini_metrics=gemini_metrics,
        questions=comparisons,
    )
