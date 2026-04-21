from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from app.models.models import AnalysisStatus, LLMProvider, QuestionCategory


# ── Business ─────────────────────────────────────────────

class BusinessCreate(BaseModel):
    name: str
    city: str
    sector: str
    website: Optional[str] = None
    competitors: list[str] = []


class BusinessOut(BusinessCreate):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Responses ─────────────────────────────────────────────

class ResponseOut(BaseModel):
    id: int
    llm_provider: LLMProvider
    raw_response: str
    tokens_used: Optional[int]
    response_time_ms: Optional[int]
    sentiment: Optional[float]
    is_mentioned: Optional[bool]
    ranking_position: Optional[int]
    accuracy: Optional[float]
    has_hallucination: Optional[bool]
    intent: Optional[str]
    confidence: Optional[float]
    topics: list[str]
    competitor_mentions: list[str]

    model_config = {"from_attributes": True}


# ── Questions ─────────────────────────────────────────────

class QuestionOut(BaseModel):
    id: int
    category: QuestionCategory
    prompt: str
    responses: list[ResponseOut] = []

    model_config = {"from_attributes": True}


# ── Analysis ─────────────────────────────────────────────

class AnalysisCreate(BaseModel):
    business_id: int


class LLMMetrics(BaseModel):
    """Métricas desglosadas por LLM"""
    provider: LLMProvider
    sentiment_score: Optional[float]
    visibility_score: Optional[float]
    accuracy_score: Optional[float]
    hallucination_rate: Optional[float]
    recommendation_rate: Optional[float]
    avg_ranking_position: Optional[float]
    dominant_intent: Optional[str]
    top_topics: list[str]
    competitor_mentions: list[str]


class AnalysisOut(BaseModel):
    id: int
    business_id: int
    status: AnalysisStatus
    total_score: Optional[float]
    sentiment_score: Optional[float]
    visibility_score: Optional[float]
    recommendation_rate: Optional[float]
    accuracy_score: Optional[float]
    hallucination_rate: Optional[float]
    knowledge_depth: Optional[float]
    llm_consistency: Optional[float]
    error_message: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]
    questions: list[QuestionOut] = []

    model_config = {"from_attributes": True}


class AnalysisSummary(BaseModel):
    """Versión resumida para listados e historial"""
    id: int
    status: AnalysisStatus
    total_score: Optional[float]
    sentiment_score: Optional[float]
    visibility_score: Optional[float]
    created_at: datetime
    completed_at: Optional[datetime]

    model_config = {"from_attributes": True}


# ── Métricas consolidadas (dashboard) ─────────────────────

class MetricsDashboard(BaseModel):
    analysis_id: int
    business: BusinessOut
    total_questions: int
    global_scores: dict[str, Optional[float]]
    by_llm: list[LLMMetrics]
    top_topics: list[str]
    all_competitor_mentions: list[str]
    recommendations: list[str]


# ── Respuestas crudas ──────────────────────────────────────

class ResponsesPayload(BaseModel):
    """Respuestas crudas de cada LLM por pregunta"""
    analysis_id: int
    total_questions: int
    total_responses: int
    questions: list[QuestionOut]


# ── Comparativa ChatGPT vs Gemini ─────────────────────────

class QuestionComparison(BaseModel):
    question_id: int
    question_text: str
    category: QuestionCategory
    openai: Optional[ResponseOut]
    gemini: Optional[ResponseOut]


class ComparePayload(BaseModel):
    """Comparativa lado a lado de OpenAI vs Gemini"""
    analysis_id: int
    openai_metrics: LLMMetrics
    gemini_metrics: LLMMetrics
    questions: list[QuestionComparison]
