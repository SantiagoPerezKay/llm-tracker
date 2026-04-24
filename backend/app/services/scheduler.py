"""
Scheduler de análisis recurrentes.

Usa APScheduler con AsyncIOScheduler para correr dentro del event loop de FastAPI.
Cada 5 minutos revisa qué schedules están vencidos y lanza los análisis correspondientes.
"""

import asyncio
import logging
from datetime import datetime, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.models import Analysis, AnalysisStatus, ScheduledAnalysis

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="UTC")


async def run_due_schedules() -> None:
    """
    Corre todos los schedules cuyo next_run_at ya venció.
    Actualiza last_run_at / next_run_at y lanza el análisis en background.
    """
    from app.routes.analyses import run_analysis_background  # evita import circular

    now = datetime.utcnow()
    pending: list[tuple[int, list[dict]]] = []

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(ScheduledAnalysis)
            .where(ScheduledAnalysis.is_active == True)  # noqa: E712
            .where(ScheduledAnalysis.next_run_at <= now)
        )
        due_schedules = result.scalars().all()

        if not due_schedules:
            return

        for sched in due_schedules:
            analysis = Analysis(
                business_id=sched.business_id,
                status=AnalysisStatus.pending,
            )
            db.add(analysis)
            await db.flush()  # necesitamos analysis.id antes del commit

            sched.last_run_at = now
            sched.next_run_at = now + timedelta(hours=sched.interval_hours)

            pending.append((analysis.id, list(sched.questions)))
            logger.info(
                f"[Scheduler] Lanzando análisis {analysis.id} "
                f"para negocio {sched.business_id} "
                f"(schedule {sched.id}, cada {sched.interval_hours}h)"
            )

        await db.commit()

    # Lanzar análisis fuera de la sesión DB para no bloquearla
    for analysis_id, questions in pending:
        asyncio.create_task(run_analysis_background(analysis_id, questions))


def start_scheduler() -> None:
    scheduler.add_job(
        run_due_schedules,
        trigger="interval",
        minutes=5,
        id="check_due_schedules",
        replace_existing=True,
        misfire_grace_time=60,
    )
    scheduler.start()
    logger.info("[Scheduler] Iniciado — revisión cada 5 minutos")


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("[Scheduler] Detenido")
