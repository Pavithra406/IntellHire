from sqlalchemy.orm import Session
from app.models.ranking import CandidateRanking
from typing import Optional, List


class RankingRepository:
    def __init__(self, db: Session):
        self.db = db

    def upsert(self, candidate_id: int, job_id: int, scores: dict) -> CandidateRanking:
        ranking = self.db.query(CandidateRanking).filter(
            CandidateRanking.candidate_id == candidate_id
        ).first()
        if not ranking:
            ranking = CandidateRanking(candidate_id=candidate_id, job_id=job_id)
            self.db.add(ranking)
        for key, value in scores.items():
            setattr(ranking, key, value)
        self.db.commit()
        self.db.refresh(ranking)
        return ranking

    def get_by_candidate(self, candidate_id: int) -> Optional[CandidateRanking]:
        return self.db.query(CandidateRanking).filter(
            CandidateRanking.candidate_id == candidate_id
        ).first()

    def get_by_job(self, job_id: int) -> List[CandidateRanking]:
        return self.db.query(CandidateRanking).filter(
            CandidateRanking.job_id == job_id
        ).order_by(CandidateRanking.overall_score.desc()).all()

    def update_ranks(self, job_id: int):
        rankings = self.get_by_job(job_id)
        for i, r in enumerate(rankings, 1):
            r.rank = i
        self.db.commit()
