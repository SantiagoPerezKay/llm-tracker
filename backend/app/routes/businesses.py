from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.models import Business, Analysis
from app.models.schemas import BusinessCreate, BusinessOut, AnalysisSummary

router = APIRouter()


@router.post("", response_model=BusinessOut, status_code=201)
async def create_business(data: BusinessCreate, db: AsyncSession = Depends(get_db)):
    business = Business(**data.model_dump())
    db.add(business)
    await db.commit()
    await db.refresh(business)
    return business


@router.get("", response_model=list[BusinessOut])
async def list_businesses(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Business).order_by(Business.created_at.desc()))
    return result.scalars().all()


@router.get("/{business_id}", response_model=BusinessOut)
async def get_business(business_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Business).where(Business.id == business_id))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    return business


@router.get("/{business_id}/history", response_model=list[AnalysisSummary])
async def get_business_history(business_id: int, db: AsyncSession = Depends(get_db)):
    """Historial de análisis de un negocio (evolución temporal)."""
    result = await db.execute(select(Business).where(Business.id == business_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Business not found")

    result = await db.execute(
        select(Analysis)
        .where(Analysis.business_id == business_id)
        .order_by(Analysis.created_at.desc())
    )
    return result.scalars().all()


@router.delete("/{business_id}", status_code=204)
async def delete_business(business_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Business).where(Business.id == business_id))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    await db.delete(business)
    await db.commit()
