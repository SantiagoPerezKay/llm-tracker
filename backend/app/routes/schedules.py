"""
CRUD de análisis programados (schedules).

Un negocio puede tener un único schedule activo.
Si se crea un nuevo schedule para un negocio que ya lo tiene, se reemplaza.
"""

import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.models import Business, ScheduledAnalysis
from app.models.schemas import ScheduleCreate, ScheduleOut, ScheduleUpdate

logger = logging.getLogger(__name__)
router = APIRouter()


def _next_run(interval_hours: int) -> datetime:
    return datetime.utcnow() + timedelta(hours=interval_hours)


# ── Crear o reemplazar schedule para un negocio ───────────

@router.post("", response_model=ScheduleOut, status_code=201)
async def create_schedule(data: ScheduleCreate, db: AsyncSession = Depends(get_db)):
    # Validar negocio
    biz = await db.get(Business, data.business_id)
    if not biz:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")

    # Validar intervalo
    if data.interval_hours not in {6, 12, 24, 72, 168, 336, 720}:
        raise HTTPException(
            status_code=422,
            detail="interval_hours debe ser uno de: 6, 12, 24, 72, 168, 336, 720",
        )

    # Si ya existe un schedule para este negocio, lo reemplazamos
    result = await db.execute(
        select(ScheduledAnalysis).where(ScheduledAnalysis.business_id == data.business_id)
    )
    existing = result.scalar_one_or_none()

    questions_json = [{"category": q.category, "prompt": q.prompt} for q in data.questions]
    next_run = _next_run(data.interval_hours)

    if existing:
        existing.questions = questions_json
        existing.interval_hours = data.interval_hours
        existing.is_active = True
        existing.next_run_at = next_run
        schedule = existing
        logger.info(f"Schedule actualizado para negocio {data.business_id}")
    else:
        schedule = ScheduledAnalysis(
            business_id=data.business_id,
            questions=questions_json,
            interval_hours=data.interval_hours,
            is_active=True,
            next_run_at=next_run,
        )
        db.add(schedule)
        logger.info(f"Schedule creado para negocio {data.business_id}")

    await db.commit()
    await db.refresh(schedule)

    # Cargar relación business para el response
    await db.refresh(schedule, ["business"])
    return schedule


# ── Listar todos los schedules ────────────────────────────

@router.get("", response_model=list[ScheduleOut])
async def list_schedules(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ScheduledAnalysis)
        .options(selectinload(ScheduledAnalysis.business))
        .order_by(ScheduledAnalysis.created_at.desc())
    )
    return result.scalars().all()


# ── Schedule de un negocio específico ────────────────────

@router.get("/business/{business_id}", response_model=ScheduleOut)
async def get_schedule_for_business(business_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ScheduledAnalysis)
        .options(selectinload(ScheduledAnalysis.business))
        .where(ScheduledAnalysis.business_id == business_id)
    )
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="No hay schedule para este negocio")
    return schedule


# ── Actualizar (activar/desactivar, cambiar intervalo) ────

@router.patch("/{schedule_id}", response_model=ScheduleOut)
async def update_schedule(
    schedule_id: int,
    data: ScheduleUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ScheduledAnalysis)
        .options(selectinload(ScheduledAnalysis.business))
        .where(ScheduledAnalysis.id == schedule_id)
    )
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule no encontrado")

    if data.is_active is not None:
        schedule.is_active = data.is_active

    if data.interval_hours is not None:
        if data.interval_hours not in {6, 12, 24, 72, 168, 336, 720}:
            raise HTTPException(status_code=422, detail="Intervalo inválido")
        schedule.interval_hours = data.interval_hours
        schedule.next_run_at = _next_run(data.interval_hours)

    if data.questions is not None:
        schedule.questions = [{"category": q.category, "prompt": q.prompt} for q in data.questions]

    await db.commit()
    await db.refresh(schedule)
    return schedule


# ── Eliminar schedule ─────────────────────────────────────

@router.delete("/{schedule_id}", status_code=204)
async def delete_schedule(schedule_id: int, db: AsyncSession = Depends(get_db)):
    schedule = await db.get(ScheduledAnalysis, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule no encontrado")
    await db.delete(schedule)
    await db.commit()
