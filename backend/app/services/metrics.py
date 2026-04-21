"""
Funciones de cómputo de métricas agregadas por LLM.
Usadas por el router de analyses para los endpoints /metrics y /compare.
"""
from collections import Counter

from app.models.models import LLMProvider, Response
from app.models.schemas import LLMMetrics


def compute_llm_metrics(provider: LLMProvider, responses: list[Response]) -> LLMMetrics:
    """Calcula métricas agregadas para un LLM específico."""
    provider_responses = [r for r in responses if r.llm_provider == provider]
    n = len(provider_responses)

    if n == 0:
        return LLMMetrics(
            provider=provider,
            sentiment_score=None,
            visibility_score=None,
            accuracy_score=None,
            hallucination_rate=None,
            recommendation_rate=None,
            avg_ranking_position=None,
            dominant_intent=None,
            top_topics=[],
            competitor_mentions=[],
        )

    def avg(values):
        valid = [v for v in values if v is not None]
        return round(sum(valid) / len(valid), 2) if valid else None

    sentiments = [r.sentiment for r in provider_responses]
    accuracies = [r.accuracy for r in provider_responses]
    positions = [r.ranking_position for r in provider_responses if r.ranking_position]

    visibility = round(sum(1 for r in provider_responses if r.is_mentioned) / n * 100, 2)
    hallucination_rate = round(sum(1 for r in provider_responses if r.has_hallucination) / n * 100, 2)
    recommendation_rate = round(sum(1 for r in provider_responses if r.intent == "recomendar") / n * 100, 2)

    intents = [r.intent for r in provider_responses if r.intent]
    dominant_intent = Counter(intents).most_common(1)[0][0] if intents else None

    all_topics: list[str] = []
    for r in provider_responses:
        all_topics.extend(r.topics or [])
    top_topics = [t for t, _ in Counter(all_topics).most_common(10)]

    all_competitors: list[str] = []
    for r in provider_responses:
        all_competitors.extend(r.competitor_mentions or [])
    competitor_mentions = list(set(all_competitors))

    return LLMMetrics(
        provider=provider,
        sentiment_score=avg(sentiments),
        visibility_score=visibility,
        accuracy_score=avg(accuracies),
        hallucination_rate=hallucination_rate,
        recommendation_rate=recommendation_rate,
        avg_ranking_position=avg(positions) if positions else None,
        dominant_intent=dominant_intent,
        top_topics=top_topics,
        competitor_mentions=competitor_mentions,
    )


def generate_recommendations(
    global_scores: dict,
    llm_metrics: list[LLMMetrics],
    business_name: str,
) -> list[str]:
    """Genera recomendaciones accionables basadas en las métricas."""
    recommendations = []

    visibility = global_scores.get("visibility_score", 0) or 0
    sentiment = global_scores.get("sentiment_score", 50) or 50
    accuracy = global_scores.get("accuracy_score", 50) or 50
    hallucination = global_scores.get("hallucination_rate", 0) or 0

    if visibility < 50:
        recommendations.append(
            f"Tu visibilidad es baja ({visibility:.0f}%): "
            "publicá más contenido de calidad sobre tu negocio en la web para que los LLMs te conozcan mejor."
        )

    if accuracy < 70:
        recommendations.append(
            f"Precisión de datos en {accuracy:.0f}%: "
            "verificá que tu dirección, teléfono y horarios estén actualizados en Google Business, "
            "tu web y directorios del sector."
        )

    if hallucination > 15:
        recommendations.append(
            f"Tasa de alucinaciones alta ({hallucination:.0f}%): "
            "los LLMs inventan información sobre vos. Publicá una página 'Sobre nosotros' detallada "
            "y añadí datos estructurados (schema.org) en tu web."
        )

    if sentiment < 60:
        recommendations.append(
            f"Sentimiento general de {sentiment:.0f}/100: "
            "trabajá en aumentar las reseñas positivas en Google y respondé a todas las reseñas."
        )

    llm_consistency = global_scores.get("llm_consistency")
    if llm_consistency and llm_consistency < 60:
        recommendations.append(
            "ChatGPT y Gemini tienen percepciones muy distintas de tu negocio: "
            "esto indica que los LLMs tienen información incompleta. "
            "Unificá tu presencia online con información consistente en todas las plataformas."
        )

    if not recommendations:
        recommendations.append(
            "Tu presencia en LLMs está en buen estado. "
            "Seguí generando contenido de calidad para mantener y mejorar tu posicionamiento."
        )

    return recommendations
