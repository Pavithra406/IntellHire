from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user, require_hr
from app.services.ranking_service import RankingService
from app.repositories.ranking_repository import RankingRepository
from app.repositories.candidate_repository import CandidateRepository

router = APIRouter(prefix="/ranking", tags=["Ranking"])


@router.post("/compute/{candidate_id}")
def compute_ranking(candidate_id: int, db: Session = Depends(get_db), hr=Depends(require_hr)):
    service = RankingService(db)
    result = service.compute_ranking(candidate_id)
    return result


@router.get("/job/{job_id}")
def get_job_rankings(job_id: int, db: Session = Depends(get_db), hr=Depends(require_hr)):
    rankings = RankingRepository(db).get_by_job(job_id)
    result = []
    for r in rankings:
        candidate = CandidateRepository(db).get_by_id(r.candidate_id)
        result.append({
            "rank": r.rank,
            "candidate_id": r.candidate_id,
            "full_name": candidate.user.full_name if candidate and candidate.user else "",
            "email": candidate.user.email if candidate and candidate.user else "",
            "overall_score": r.overall_score,
            "resume_score": r.resume_score,
            "aptitude_score": r.aptitude_score,
            "sql_score": r.sql_score,
            "coding_score": r.coding_score,
            "interview_score": r.interview_score,
            "violation_penalty": r.violation_penalty,
            "ai_recommendation": r.ai_recommendation,
            "status": candidate.status if candidate else ""
        })
    return result


@router.get("/me")
def my_ranking(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role != "candidate":
        raise HTTPException(403, "Candidates only")
    candidate = CandidateRepository(db).get_by_user_id(current_user.id)
    if not candidate:
        raise HTTPException(404, "Not found")
    ranking = RankingRepository(db).get_by_candidate(candidate.id)
    if not ranking:
        return {"message": "Ranking not yet computed"}
    return {
        "overall_score": ranking.overall_score,
        "rank": ranking.rank,
        "score_breakdown": ranking.score_breakdown,
        "ai_recommendation": ranking.ai_recommendation
    }
