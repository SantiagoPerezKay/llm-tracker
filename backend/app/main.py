from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.database import engine, Base
from app.routes import businesses, analyses, questions
from app.routes import schedules
from app.services.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Crear tablas al iniciar
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Iniciar scheduler de análisis recurrentes
    start_scheduler()

    yield

    # Detener scheduler al apagar
    stop_scheduler()


app = FastAPI(
    title="LLM Brand Tracker API",
    description="Analiza cómo ChatGPT y Gemini perciben tu negocio",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(businesses.router, prefix="/api/businesses",  tags=["Businesses"])
app.include_router(analyses.router,   prefix="/api/analyses",    tags=["Analyses"])
app.include_router(questions.router,  prefix="/api/questions",   tags=["Questions"])
app.include_router(schedules.router,  prefix="/api/schedules",   tags=["Schedules"])


@app.get("/api/health", tags=["Health"])
@app.get("/health", include_in_schema=False)
async def health_check():
    return {"status": "ok", "version": "1.0.0"}
