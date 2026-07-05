from sqlalchemy.orm import Session
from app.models.resume import Resume
from typing import Optional


class ResumeRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, candidate_id: int, file_path: str, file_name: str) -> Resume:
        resume = Resume(candidate_id=candidate_id, file_path=file_path, file_name=file_name)
        self.db.add(resume)
        self.db.commit()
        self.db.refresh(resume)
        return resume

    def get_by_candidate(self, candidate_id: int) -> Optional[Resume]:
        return self.db.query(Resume).filter(Resume.candidate_id == candidate_id).first()

    def update_extracted(self, resume_id: int, data: dict) -> Resume:
        resume = self.db.query(Resume).filter(Resume.id == resume_id).first()
        for key, value in data.items():
            setattr(resume, key, value)
        self.db.commit()
        self.db.refresh(resume)
        return resume

    def update_screening(self, resume_id: int, match_pct: float, missing: list,
                         strengths: list, weaknesses: list, recommendations: str, status: str) -> Resume:
        resume = self.db.query(Resume).filter(Resume.id == resume_id).first()
        resume.match_percentage = match_pct
        resume.missing_skills = missing
        resume.strengths = strengths
        resume.weaknesses = weaknesses
        resume.recommendations = recommendations
        resume.screening_status = status
        self.db.commit()
        self.db.refresh(resume)
        return resume
