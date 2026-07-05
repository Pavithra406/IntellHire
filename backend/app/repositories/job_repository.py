from sqlalchemy.orm import Session
from app.models.job import JobOpening
from typing import Optional, List


class JobRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, hr_user_id: int, company_id: int, data: dict) -> JobOpening:
        job = JobOpening(hr_user_id=hr_user_id, company_id=company_id, **data)
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job

    def get_by_id(self, job_id: int) -> Optional[JobOpening]:
        return self.db.query(JobOpening).filter(JobOpening.id == job_id).first()

    def get_all_by_hr(self, hr_user_id: int) -> List[JobOpening]:
        return self.db.query(JobOpening).filter(JobOpening.hr_user_id == hr_user_id).all()

    def get_all_active(self) -> List[JobOpening]:
        return self.db.query(JobOpening).filter(JobOpening.is_active == True).all()

    def update(self, job_id: int, data: dict) -> Optional[JobOpening]:
        job = self.get_by_id(job_id)
        if not job:
            return None
        for key, value in data.items():
            if value is not None:
                setattr(job, key, value)
        self.db.commit()
        self.db.refresh(job)
        return job
