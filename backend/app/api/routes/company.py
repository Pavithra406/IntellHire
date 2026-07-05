from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_hr
from app.models.company import CompanyProfile
from app.schemas.company import CompanyCreate, CompanyUpdate, CompanyOut

router = APIRouter(prefix="/company", tags=["Company"])


@router.post("", response_model=CompanyOut)
def create_company(data: CompanyCreate, db: Session = Depends(get_db), hr=Depends(require_hr)):
    existing = db.query(CompanyProfile).filter(CompanyProfile.hr_user_id == hr.id).first()
    if existing:
        raise HTTPException(400, "Company profile already exists")
    company = CompanyProfile(hr_user_id=hr.id, **data.model_dump())
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


@router.get("", response_model=CompanyOut)
def get_company(db: Session = Depends(get_db), hr=Depends(require_hr)):
    company = db.query(CompanyProfile).filter(CompanyProfile.hr_user_id == hr.id).first()
    if not company:
        raise HTTPException(404, "Company profile not found")
    return company


@router.put("", response_model=CompanyOut)
def update_company(data: CompanyUpdate, db: Session = Depends(get_db), hr=Depends(require_hr)):
    company = db.query(CompanyProfile).filter(CompanyProfile.hr_user_id == hr.id).first()
    if not company:
        raise HTTPException(404, "Company profile not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(company, k, v)
    db.commit()
    db.refresh(company)
    return company
