from sqlalchemy.orm import Session, joinedload
from app.models.candidate import Candidate
from typing import Optional, List


class CandidateRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, user_id: int, job_id: int, created_by_id: int) -> Candidate:
        candidate = Candidate(user_id=user_id, job_id=job_id, created_by_id=created_by_id)
        self.db.add(candidate)
        self.db.commit()
        self.db.refresh(candidate)
        return candidate

    def get_by_id(self, candidate_id: int) -> Optional[Candidate]:
        return self.db.query(Candidate).options(
            joinedload(Candidate.user),
            joinedload(Candidate.job),
            joinedload(Candidate.resume),
            joinedload(Candidate.assessments),
            joinedload(Candidate.interview),
            joinedload(Candidate.violations),
            joinedload(Candidate.ranking)
        ).filter(Candidate.id == candidate_id).first()

    def get_by_user_id(self, user_id: int) -> Optional[Candidate]:
        return self.db.query(Candidate).filter(Candidate.user_id == user_id).first()

    def get_by_job(self, job_id: int) -> List[Candidate]:
        return self.db.query(Candidate).options(
            joinedload(Candidate.user),
            joinedload(Candidate.resume),
            joinedload(Candidate.ranking)
        ).filter(Candidate.job_id == job_id).all()

    def get_all_by_hr(self, hr_user_id: int) -> List[Candidate]:
        from app.models.job import JobOpening
        return self.db.query(Candidate).join(JobOpening).options(
            joinedload(Candidate.user),
            joinedload(Candidate.job),
            joinedload(Candidate.ranking)
        ).filter(JobOpening.hr_user_id == hr_user_id).all()

    def update_status(self, candidate_id: int, status: str, notes: str = None) -> Candidate:
        candidate = self.db.query(Candidate).filter(Candidate.id == candidate_id).first()
        candidate.status = status
        if notes:
            candidate.hr_notes = notes
        self.db.commit()
        self.db.refresh(candidate)
        return candidate

    def update_score(self, candidate_id: int, overall_score: float, rank: int = None):
        candidate = self.db.query(Candidate).filter(Candidate.id == candidate_id).first()
        candidate.overall_score = overall_score
        if rank:
            candidate.rank = rank
        self.db.commit()
        self.db.refresh(candidate)
        return candidate
