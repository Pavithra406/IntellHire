from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import require_hr, get_current_user
from app.repositories.candidate_repository import CandidateRepository
from app.repositories.user_repository import UserRepository
from app.repositories.job_repository import JobRepository
from app.schemas.user import CandidateCreate
from app.schemas.candidate import CandidateStatusUpdate
from app.core.security import hash_password
import secrets, string

router = APIRouter(prefix="/candidates", tags=["Candidates"])


def generate_password(length: int = 10) -> str:
    chars = string.ascii_letters + string.digits
    return ''.join(secrets.choice(chars) for _ in range(length))


@router.post("")
def create_candidate(data: CandidateCreate, db: Session = Depends(get_db), hr=Depends(require_hr)):
    user_repo = UserRepository(db)
    candidate_repo = CandidateRepository(db)
    job_repo = JobRepository(db)

    job = job_repo.get_by_id(data.job_id)
    if not job or job.hr_user_id != hr.id:
        raise HTTPException(404, "Job not found")

    if user_repo.get_by_email(data.email):
        raise HTTPException(400, "Email already registered")

    user = user_repo.create(data.email, data.full_name, data.password, role="candidate")
    candidate = candidate_repo.create(user.id, data.job_id, hr.id)

    return {
        "candidate_id": candidate.id,
        "user_id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "job_id": data.job_id,
        "password": data.password,
        "status": candidate.status
    }


@router.get("")
def list_candidates(db: Session = Depends(get_db), hr=Depends(require_hr)):
    repo = CandidateRepository(db)
    candidates = repo.get_all_by_hr(hr.id)
    result = []
    for c in candidates:
        result.append({
            "id": c.id,
            "user_id": c.user_id,
            "full_name": c.user.full_name if c.user else "",
            "email": c.user.email if c.user else "",
            "job_id": c.job_id,
            "job_title": c.job.title if c.job else "",
            "status": c.status,
            "overall_score": c.overall_score,
            "rank": c.rank,
            "created_at": c.created_at.isoformat()
        })
    return result


@router.get("/me")
def get_my_profile(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role != "candidate":
        raise HTTPException(403, "Candidates only")
    repo = CandidateRepository(db)
    candidate = repo.get_by_user_id(current_user.id)
    if not candidate:
        raise HTTPException(404, "Candidate profile not found")
    return {
        "id": candidate.id,
        "user_id": candidate.user_id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "job_id": candidate.job_id,
        "job_title": candidate.job.title if candidate.job else "",
        "status": candidate.status,
        "overall_score": candidate.overall_score,
        "rank": candidate.rank
    }


@router.get("/{candidate_id}")
def get_candidate(candidate_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    repo = CandidateRepository(db)
    candidate = repo.get_by_id(candidate_id)
    if not candidate:
        raise HTTPException(404, "Candidate not found")

    # Candidates can only view their own profile
    if current_user.role == "candidate" and candidate.user_id != current_user.id:
        raise HTTPException(403, "Access denied")

    return {
        "id": candidate.id,
        "full_name": candidate.user.full_name if candidate.user else "",
        "email": candidate.user.email if candidate.user else "",
        "job_id": candidate.job_id,
        "job_title": candidate.job.title if candidate.job else "",
        "status": candidate.status,
        "overall_score": candidate.overall_score,
        "rank": candidate.rank,
        "hr_notes": candidate.hr_notes,
        "resume": {
            "match_percentage": candidate.resume.match_percentage,
            "screening_status": candidate.resume.screening_status,
            "strengths": candidate.resume.strengths,
            "weaknesses": candidate.resume.weaknesses,
            "missing_skills": candidate.resume.missing_skills,
            "recommendations": candidate.resume.recommendations,
            "extracted_skills": candidate.resume.extracted_skills,
        } if candidate.resume else None,
        "assessments": [
            {"type": a.assessment_type, "status": a.status, "percentage": a.percentage}
            for a in candidate.assessments
        ],
        "interview": {
            "status": candidate.interview.status,
            "overall_score": candidate.interview.overall_score,
            "technical_score": candidate.interview.technical_score,
            "communication_score": candidate.interview.communication_score,
            "ai_feedback": candidate.interview.ai_feedback,
            "transcript": candidate.interview.transcript,
        } if candidate.interview else None,
        "violations": len(candidate.violations),
        "ranking": {
            "overall_score": candidate.ranking.overall_score,
            "rank": candidate.ranking.rank,
            "ai_recommendation": candidate.ranking.ai_recommendation,
            "score_breakdown": candidate.ranking.score_breakdown
        } if candidate.ranking else None
    }


@router.patch("/{candidate_id}/status")
def update_status(candidate_id: int, data: CandidateStatusUpdate,
                  db: Session = Depends(get_db), hr=Depends(require_hr)):
    repo = CandidateRepository(db)
    candidate = repo.get_by_id(candidate_id)
    if not candidate:
        raise HTTPException(404, "Candidate not found")
    if candidate.job.hr_user_id != hr.id:
        raise HTTPException(403, "Access denied")
    updated = repo.update_status(candidate_id, data.status, data.hr_notes)
    return {"id": updated.id, "status": updated.status}
