"""
Consulta OpenAI y Gemini en paralelo para cada pregunta.
Usa asyncio.Semaphore para no superar el límite de llamadas concurrentes.
"""
import asyncio
import logging
import time
from dataclasses import dataclass

import google.generativeai as genai
from openai import AsyncOpenAI

from app.core.config import settings
from app.models.models import LLMProvider

logger = logging.getLogger(__name__)

# Clientes
openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
genai.configure(api_key=settings.GEMINI_API_KEY)
gemini_model = genai.GenerativeModel(settings.GEMINI_MODEL)

# Semáforo global para limitar concurrencia
_semaphore = asyncio.Semaphore(settings.MAX_CONCURRENT_LLM_CALLS)

SYSTEM_PROMPT = (
    "Responde de forma directa y útil. "
    "Si no tienes información suficiente sobre algo, indícalo claramente."
)


@dataclass
class LLMResponse:
    provider: LLMProvider
    question: str
    raw_response: str
    tokens_used: int | None
    response_time_ms: int
    error: str | None = None
    input_tokens: int | None = None
    output_tokens: int | None = None


async def query_openai(question: str) -> LLMResponse:
    """Consulta a OpenAI con timeout y manejo de errores."""
    async with _semaphore:
        start = time.monotonic()
        try:
            response = await asyncio.wait_for(
                openai_client.chat.completions.create(
                    model=settings.OPENAI_MODEL,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": question},
                    ],
                    max_tokens=settings.LLM_MAX_TOKENS,
                    temperature=0.7,
                ),
                timeout=settings.LLM_TIMEOUT_SECONDS,
            )
            elapsed_ms = int((time.monotonic() - start) * 1000)
            return LLMResponse(
                provider=LLMProvider.openai,
                question=question,
                raw_response=response.choices[0].message.content or "",
                tokens_used=response.usage.total_tokens if response.usage else None,
                input_tokens=response.usage.prompt_tokens if response.usage else None,
                output_tokens=response.usage.completion_tokens if response.usage else None,
                response_time_ms=elapsed_ms,
            )
        except asyncio.TimeoutError:
            elapsed_ms = int((time.monotonic() - start) * 1000)
            logger.warning(f"OpenAI timeout for question: {question[:60]}...")
            return LLMResponse(
                provider=LLMProvider.openai,
                question=question,
                raw_response="",
                tokens_used=None,
                response_time_ms=elapsed_ms,
                error="timeout",
            )
        except Exception as e:
            elapsed_ms = int((time.monotonic() - start) * 1000)
            logger.error(f"OpenAI error: {e}")
            return LLMResponse(
                provider=LLMProvider.openai,
                question=question,
                raw_response="",
                tokens_used=None,
                response_time_ms=elapsed_ms,
                error=str(e),
            )


async def query_gemini(question: str) -> LLMResponse:
    """Consulta a Gemini con timeout y manejo de errores."""
    async with _semaphore:
        start = time.monotonic()
        try:
            full_prompt = f"{SYSTEM_PROMPT}\n\n{question}"
            response = await asyncio.wait_for(
                asyncio.to_thread(gemini_model.generate_content, full_prompt),
                timeout=settings.LLM_TIMEOUT_SECONDS,
            )
            elapsed_ms = int((time.monotonic() - start) * 1000)

            text = ""
            if response.candidates and response.candidates[0].content.parts:
                text = response.candidates[0].content.parts[0].text

            tokens = None
            input_tok = None
            output_tok = None
            if hasattr(response, "usage_metadata"):
                tokens = response.usage_metadata.total_token_count
                input_tok = getattr(response.usage_metadata, "prompt_token_count", None)
                output_tok = getattr(response.usage_metadata, "candidates_token_count", None)

            return LLMResponse(
                provider=LLMProvider.gemini,
                question=question,
                raw_response=text,
                tokens_used=tokens,
                input_tokens=input_tok,
                output_tokens=output_tok,
                response_time_ms=elapsed_ms,
            )
        except asyncio.TimeoutError:
            elapsed_ms = int((time.monotonic() - start) * 1000)
            logger.warning(f"Gemini timeout for question: {question[:60]}...")
            return LLMResponse(
                provider=LLMProvider.gemini,
                question=question,
                raw_response="",
                tokens_used=None,
                response_time_ms=elapsed_ms,
                error="timeout",
            )
        except Exception as e:
            elapsed_ms = int((time.monotonic() - start) * 1000)
            logger.error(f"Gemini error: {e}")
            return LLMResponse(
                provider=LLMProvider.gemini,
                question=question,
                raw_response="",
                tokens_used=None,
                response_time_ms=elapsed_ms,
                error=str(e),
            )


async def query_both_llms(question: str) -> tuple[LLMResponse, LLMResponse]:
    """Consulta ambos LLMs en paralelo para una pregunta."""
    openai_result, gemini_result = await asyncio.gather(
        query_openai(question),
        query_gemini(question),
    )
    return openai_result, gemini_result


async def query_all_questions(questions: list[str]) -> list[tuple[LLMResponse, LLMResponse]]:
    """
    Consulta ambos LLMs para todas las preguntas en paralelo.
    El semáforo asegura no superar MAX_CONCURRENT_LLM_CALLS llamadas simultáneas.
    """
    logger.info(f"Querying {len(questions)} questions to both LLMs ({len(questions) * 2} total calls)")

    tasks = [query_both_llms(q) for q in questions]
    results = await asyncio.gather(*tasks)

    successful = sum(
        1 for openai_r, gemini_r in results
        if not openai_r.error and not gemini_r.error
    )
    logger.info(f"Completed: {successful}/{len(questions)} question pairs without errors")

    return list(results)
