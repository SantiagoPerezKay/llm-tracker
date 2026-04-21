from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.database import engine, Base
from app.routes import businesses, analyses


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


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

app.include_router(businesses.router, prefix="/api/businesses", tags=["Businesses"])
app.include_router(analyses.router, prefix="/api/analyses", tags=["Analyses"])


@app.get("/api/health", tags=["Health"])
@app.get("/health", include_in_schema=False)
async def health_check():
    return {"status": "ok", "version": "1.0.0"}
