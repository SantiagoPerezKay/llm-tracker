from datetime import datetime
from enum import Enum as PyEnum
from typing import Optional

from sqlalchemy import (
    Integer, String, Float, Boolean, DateTime, ForeignKey,
    Enum, Text, ARRAY, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AnalysisStatus(str, PyEnum):
    pending = "pending"
    generating_questions = "generating_questions"
    querying_llms = "querying_llms"
    analyzing = "analyzing"
    completed = "completed"
    failed = "failed"


class LLMProvider(str, PyEnum):
    openai = "openai"
    gemini = "gemini"


class QuestionCategory(str, PyEnum):
    conocimiento = "conocimiento"        # Qué sabe la IA sobre vos
    recomendacion = "recomendacion"      # Te recomienda o no
    comparativa = "comparativa"          # Cómo te compara con competidores
    reputacion = "reputacion"            # Qué dice de tu reputación
    servicios = "servicios"              # Qué servicios te asocia
    precio = "precio"                    # Cómo percibe tus precios


class Business(Base):
    __tablename__ = "businesses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    city: Mapped[str] = mapped_column(String(255), nullable=False)
    sector: Mapped[str] = mapped_column(String(255), nullable=False)
    website: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    competitors: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    analyses: Mapped[list["Analysis"]] = relationship("Analysis", back_populates="business", cascade="all, delete-orphan")


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), nullable=False)
    status: Mapped[AnalysisStatus] = mapped_column(Enum(AnalysisStatus), default=AnalysisStatus.pending)

    # Scores globales (promedios)
    total_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sentiment_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    visibility_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    recommendation_rate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    accuracy_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    hallucination_rate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    knowledge_depth: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    llm_consistency: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    business: Mapped["Business"] = relationship("Business", back_populates="analyses")
    questions: Mapped[list["Question"]] = relationship("Question", back_populates="analysis", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    analysis_id: Mapped[int] = mapped_column(ForeignKey("analyses.id"), nullable=False)
    category: Mapped[QuestionCategory] = mapped_column(Enum(QuestionCategory), nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)

    analysis: Mapped["Analysis"] = relationship("Analysis", back_populates="questions")
    responses: Mapped[list["Response"]] = relationship("Response", back_populates="question", cascade="all, delete-orphan")


class Response(Base):
    __tablename__ = "responses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id"), nullable=False)
    llm_provider: Mapped[LLMProvider] = mapped_column(Enum(LLMProvider), nullable=False)

    # Respuesta cruda
    raw_response: Mapped[str] = mapped_column(Text, nullable=False)
    tokens_used: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    response_time_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Métricas extraídas por el LLM analista
    sentiment: Mapped[Optional[float]] = mapped_column(Float, nullable=True)          # 0-100
    is_mentioned: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)      # visibilidad
    ranking_position: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)   # pos. en lista
    accuracy: Mapped[Optional[float]] = mapped_column(Float, nullable=True)           # 0-100
    has_hallucination: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    intent: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)          # recomendar/informar/advertir
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)         # 0-100
    topics: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    competitor_mentions: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)

    question: Mapped["Question"] = relationship("Question", back_populates="responses")
