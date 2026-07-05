from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import require_hr, get_current_user
from app.repositories.job_repository import JobRepository
from app.models.company import CompanyProfile
from app.schemas.job import JobCreate, JobUpdate, JobOut

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.post("", response_model=JobOut)
def create_job(data: JobCreate, db: Session = Depends(get_db), hr=Depends(require_hr)):
    company = db.query(CompanyProfile).filter(CompanyProfile.hr_user_id == hr.id).first()
    if not company:
        raise HTTPException(400, "Create a company profile first")
    repo = JobRepository(db)
    job = repo.create(hr.id, company.id, data.model_dump())
    return job


@router.get("", response_model=List[JobOut])
def list_jobs(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    repo = JobRepository(db)
    if current_user.role == "hr":
        return repo.get_all_by_hr(current_user.id)
    return repo.get_all_active()


@router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    job = JobRepository(db).get_by_id(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job


@router.put("/{job_id}", response_model=JobOut)
def update_job(job_id: int, data: JobUpdate, db: Session = Depends(get_db), hr=Depends(require_hr)):
    repo = JobRepository(db)
    job = repo.get_by_id(job_id)
    if not job or job.hr_user_id != hr.id:
        raise HTTPException(404, "Job not found")
    return repo.update(job_id, data.model_dump(exclude_none=True))
