"""
Analiza cada respuesta cruda de OpenAI/Gemini y extrae las 12 métricas
usando GPT-4.1-mini como modelo analista (más barato y suficientemente preciso).
"""
import asyncio
import json
import logging
from dataclasses import dataclass

from openai import AsyncOpenAI

from app.core.config import settings
from app.services.llm_client import LLMResponse

logger = logging.getLogger(__name__)
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

# Semáforo para análisis (puede ser más agresivo que las consultas)
_analysis_semaphore = asyncio.Semaphore(20)

ANALYSIS_SYSTEM_PROMPT = """Eres un analista experto en brand intelligence y percepción de marca.
Tu tarea es analizar respuestas de modelos de IA (ChatGPT, Gemini) y extraer métricas
sobre cómo perciben un negocio específico.

Devuelve ÚNICAMENTE un JSON válido con las métricas indicadas. Sin texto adicional."""


def build_analysis_prompt(
    business_name: str,
    question: str,
    raw_response: str,
    competitors: list[str],
) -> str:
    competitors_str = ", ".join(competitors) if competitors else "ninguno especificado"

    return f"""Analiza esta respuesta de un LLM sobre el negocio "{business_name}".

PREGUNTA ORIGINAL:
{question}

RESPUESTA DEL LLM:
{raw_response or "(sin respuesta / error)"}

COMPETIDORES DEL NEGOCIO: {competitors_str}

Extrae las siguientes métricas y devuelve este JSON exacto:
{{
  "sentiment": <número 0-100, donde 0=muy negativo, 50=neutro, 100=muy positivo>,
  "is_mentioned": <true si el negocio es mencionado en la respuesta, false si no>,
  "ranking_position": <número entero de la posición si aparece en una lista (1=primero), null si no aplica>,
  "accuracy": <número 0-100 estimando qué tan correcta/factual parece la info (100=todo parece correcto)>,
  "has_hallucination": <true si detectas información inventada o claramente incorrecta, false si no>,
  "intent": <una de: "recomendar", "informar", "advertir", "comparar", "disuadir", "desconocer">,
  "confidence": <número 0-100 de qué tan seguro habla el LLM sobre el negocio>,
  "topics": <array de strings con los temas/atributos que el LLM asocia al negocio, máx 8>,
  "competitor_mentions": <array con los nombres de competidores que se mencionan en la respuesta>
}}

Reglas:
- Si la respuesta está vacía o hubo error, usa: sentiment=50, is_mentioned=false, todos los demás en null/[]
- Para "topics", usa términos concisos en español (ej: "precios altos", "urgencias 24h", "buen trato")
- Para "competitor_mentions", solo incluye los que aparezcan explícitamente en la respuesta
- "accuracy" debe ser 50 (neutro) si no tienes información suficiente para evaluar"""


@dataclass
class AnalyzedMetrics:
    sentiment: float
    is_mentioned: bool
    ranking_position: int | None
    accuracy: float
    has_hallucination: bool
    intent: str
    confidence: float
    topics: list[str]
    competitor_mentions: list[str]


def _default_metrics() -> AnalyzedMetrics:
    return AnalyzedMetrics(
        sentiment=50.0,
        is_mentioned=False,
        ranking_position=None,
        accuracy=50.0,
        has_hallucination=False,
        intent="desconocer",
        confidence=0.0,
        topics=[],
        competitor_mentions=[],
    )


async def analyze_response(
    llm_response: LLMResponse,
    business_name: str,
    competitors: list[str],
) -> AnalyzedMetrics:
    """Analiza una respuesta individual y extrae las métricas."""
    if llm_response.error and not llm_response.raw_response:
        return _default_metrics()

    async with _analysis_semaphore:
        try:
            response = await client.chat.completions.create(
                model=settings.OPENAI_ANALYZER_MODEL,
                messages=[
                    {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": build_analysis_prompt(
                            business_name,
                            llm_response.question,
                            llm_response.raw_response,
                            competitors,
                        ),
                    },
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
                max_tokens=500,
            )

            data = json.loads(response.choices[0].message.content)

            return AnalyzedMetrics(
                sentiment=float(data.get("sentiment", 50)),
                is_mentioned=bool(data.get("is_mentioned", False)),
                ranking_position=data.get("ranking_position"),
                accuracy=float(data.get("accuracy", 50)),
                has_hallucination=bool(data.get("has_hallucination", False)),
                intent=data.get("intent", "desconocer"),
                confidence=float(data.get("confidence", 0)),
                topics=data.get("topics", []),
                competitor_mentions=data.get("competitor_mentions", []),
            )

        except Exception as e:
            logger.error(f"Analysis error for {llm_response.provider}: {e}")
            return _default_metrics()


async def analyze_all_responses(
    llm_responses: list[LLMResponse],
    business_name: str,
    competitors: list[str],
) -> list[tuple[LLMResponse, AnalyzedMetrics]]:
    """Analiza todas las respuestas en paralelo."""
    logger.info(f"Analyzing {len(llm_responses)} responses")

    tasks = [
        analyze_response(resp, business_name, competitors)
        for resp in llm_responses
    ]
    metrics_list = await asyncio.gather(*tasks)

    return list(zip(llm_responses, metrics_list))


def compute_global_scores(
    analyzed: list[tuple[LLMResponse, AnalyzedMetrics]],
) -> dict:
    """
    Calcula los scores globales del análisis (promedios de todas las respuestas).
    Devuelve un dict con las 8 métricas principales.
    """
    if not analyzed:
        return {}

    all_metrics = [m for _, m in analyzed]
    n = len(all_metrics)

    def avg(values):
        valid = [v for v in values if v is not None]
        return round(sum(valid) / len(valid), 2) if valid else None

    # Visibilidad: % de respuestas donde se menciona el negocio
    visibility = round(sum(1 for m in all_metrics if m.is_mentioned) / n * 100, 2)

    # Tasa de alucinaciones
    hallucination_rate = round(sum(1 for m in all_metrics if m.has_hallucination) / n * 100, 2)

    # Tasa de recomendación (solo respuestas con intent=recomendar)
    recommendation_rate = round(
        sum(1 for m in all_metrics if m.intent == "recomendar") / n * 100, 2
    )

    # Posición media de ranking (solo las que tienen posición)
    ranking_positions = [m.ranking_position for m in all_metrics if m.ranking_position]
    avg_ranking = round(sum(ranking_positions) / len(ranking_positions), 2) if ranking_positions else None

    # Consistencia entre LLMs: compara sentiment de OpenAI vs Gemini por pregunta
    # Baja diferencia = alta consistencia
    from app.models.models import LLMProvider
    pairs_by_question: dict[str, dict] = {}
    for resp, metrics in analyzed:
        q = resp.question
        if q not in pairs_by_question:
            pairs_by_question[q] = {}
        pairs_by_question[q][resp.provider] = metrics.sentiment

    consistency_scores = []
    for q, providers in pairs_by_question.items():
        if LLMProvider.openai in providers and LLMProvider.gemini in providers:
            diff = abs(providers[LLMProvider.openai] - providers[LLMProvider.gemini])
            consistency_scores.append(max(0, 100 - diff))

    llm_consistency = avg(consistency_scores)

    # Profundidad de conocimiento: promedio de confidence
    knowledge_depth = avg([m.confidence for m in all_metrics])

    # Score total ponderado
    sentiment_avg = avg([m.sentiment for m in all_metrics])
    accuracy_avg = avg([m.accuracy for m in all_metrics])

    total_score = None
    if all(v is not None for v in [sentiment_avg, visibility, accuracy_avg, recommendation_rate]):
        total_score = round(
            sentiment_avg * 0.30
            + visibility * 0.25
            + accuracy_avg * 0.20
            + recommendation_rate * 0.25,
            2,
        )

    return {
        "total_score": total_score,
        "sentiment_score": sentiment_avg,
        "visibility_score": visibility,
        "recommendation_rate": recommendation_rate,
        "accuracy_score": accuracy_avg,
        "hallucination_rate": hallucination_rate,
        "knowledge_depth": knowledge_depth,
        "llm_consistency": llm_consistency,
    }
