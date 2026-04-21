"""
Genera 24 preguntas en 6 categorías usando un LLM.
Las preguntas simulan lo que un cliente real le preguntaría a ChatGPT o Gemini.
"""
import json
import logging
from openai import AsyncOpenAI

from app.core.config import settings
from app.models.models import QuestionCategory

logger = logging.getLogger(__name__)

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

CATEGORY_DESCRIPTIONS = {
    QuestionCategory.conocimiento: "Preguntas sobre qué sabe la IA del negocio (historia, equipo, ubicación, datos de contacto)",
    QuestionCategory.recomendacion: "Preguntas donde el usuario pide que la IA recomiende el mejor negocio del sector en la zona",
    QuestionCategory.comparativa: "Preguntas que comparan el negocio con sus competidores",
    QuestionCategory.reputacion: "Preguntas sobre la reputación, reseñas y opiniones de clientes",
    QuestionCategory.servicios: "Preguntas sobre los servicios, especialidades y horarios del negocio",
    QuestionCategory.precio: "Preguntas sobre precios, accesibilidad económica y relación calidad-precio",
}

SYSTEM_PROMPT = """Eres un experto en marketing digital y comportamiento de búsqueda por IA.
Tu tarea es generar preguntas realistas que usuarios reales harían a ChatGPT o Gemini
sobre un negocio específico. Las preguntas deben sonar naturales y conversacionales,
como si las escribiera un usuario real (no demasiado formal).

Devuelve ÚNICAMENTE un JSON válido con el formato especificado, sin texto adicional."""


def build_user_prompt(
    business_name: str,
    city: str,
    sector: str,
    competitors: list[str],
    category: QuestionCategory,
    n_questions: int,
) -> str:
    competitors_str = (
        f"Sus competidores conocidos son: {', '.join(competitors)}."
        if competitors
        else "No se especificaron competidores."
    )

    return f"""Genera {n_questions} preguntas de la categoría "{category.value}" para este negocio:

Negocio: {business_name}
Ciudad: {city}
Sector: {sector}
{competitors_str}

Categoría a generar: {CATEGORY_DESCRIPTIONS[category]}

Reglas:
- Las preguntas deben ser variadas (no repetitivas)
- Mezcla preguntas con el nombre del negocio y preguntas genéricas del sector
- Usa lenguaje natural y coloquial en español
- Para la categoría "recomendacion", algunas preguntas NO deben mencionar el negocio directamente
  (ej: "cuál es la mejor {sector} en {city}?") para medir si la IA lo menciona espontáneamente

Devuelve exactamente este JSON:
{{
  "questions": [
    "pregunta 1",
    "pregunta 2",
    ...
  ]
}}"""


async def generate_questions_for_category(
    business_name: str,
    city: str,
    sector: str,
    competitors: list[str],
    category: QuestionCategory,
) -> list[str]:
    """Genera preguntas para una categoría específica."""
    n = settings.QUESTIONS_PER_CATEGORY

    response = await client.chat.completions.create(
        model=settings.OPENAI_ANALYZER_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": build_user_prompt(
                    business_name, city, sector, competitors, category, n
                ),
            },
        ],
        response_format={"type": "json_object"},
        temperature=0.8,
        max_tokens=1000,
    )

    content = response.choices[0].message.content
    data = json.loads(content)
    questions = data.get("questions", [])

    logger.info(f"Generated {len(questions)} questions for category {category.value}")
    return questions


async def generate_all_questions(
    business_name: str,
    city: str,
    sector: str,
    competitors: list[str],
) -> dict[QuestionCategory, list[str]]:
    """
    Genera preguntas para todas las categorías en paralelo.
    Retorna un dict {categoría: [preguntas]}.
    """
    import asyncio

    tasks = {
        category: generate_questions_for_category(
            business_name, city, sector, competitors, category
        )
        for category in QuestionCategory
    }

    results = await asyncio.gather(*tasks.values(), return_exceptions=True)

    questions_by_category: dict[QuestionCategory, list[str]] = {}
    for category, result in zip(tasks.keys(), results):
        if isinstance(result, Exception):
            logger.error(f"Error generating questions for {category}: {result}")
            questions_by_category[category] = []
        else:
            questions_by_category[category] = result

    total = sum(len(q) for q in questions_by_category.values())
    logger.info(f"Total questions generated: {total}")
    return questions_by_category
