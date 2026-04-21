from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    DEBUG: bool = False
    APP_NAME: str = "LLM Brand Tracker"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/llm_tracker"

    # OpenAI
    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-4.1"
    OPENAI_ANALYZER_MODEL: str = "gpt-4.1-mini"

    # Gemini
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-2.5-pro"

    # Analysis settings
    QUESTIONS_PER_CATEGORY: int = 4          # 6 categorías × 4 = 24 preguntas
    MAX_CONCURRENT_LLM_CALLS: int = 10       # límite de llamadas paralelas
    LLM_TIMEOUT_SECONDS: int = 30
    LLM_MAX_TOKENS: int = 1000


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
