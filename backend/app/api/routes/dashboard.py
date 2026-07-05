from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_hr, get_current_user
from app.repositories.candidate_repository import CandidateRepository
from app.repositories.job_repository import JobRepository
from app.models.candidate import Candidate
from app.models.job import JobOpening

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/hr")
def hr_dashboard(db: Session = Depends(get_db), hr=Depends(require_hr)):
    candidates = CandidateRepository(db).get_all_by_hr(hr.id)
    jobs = JobRepository(db).get_all_by_hr(hr.id)

    total = len(candidates)
    status_counts = {}
    for c in candidates:
        status_counts[c.status] = status_counts.get(c.status, 0) + 1

    # Score averages
    scores = [c.overall_score for c in candidates if c.overall_score]
    avg_score = sum(scores) / len(scores) if scores else 0

    # Recent candidates
    recent = sorted(candidates, key=lambda x: x.created_at, reverse=True)[:5]
    recent_list = [
        {
            "id": c.id,
            "full_name": c.user.full_name if c.user else "",
            "job_title": c.job.title if c.job else "",
            "status": c.status,
            "overall_score": c.overall_score,
            "rank": c.rank
        }
        for c in recent
    ]

    return {
        "total_candidates": total,
        "total_jobs": len(jobs),
        "status_breakdown": status_counts,
        "selected": status_counts.get("shortlisted", 0) + status_counts.get("hired", 0),
        "rejected": status_counts.get("rejected", 0) + status_counts.get("resume_rejected", 0),
        "pending": status_counts.get("pending", 0),
        "avg_score": round(avg_score, 2),
        "recent_candidates": recent_list,
        "jobs": [{"id": j.id, "title": j.title, "is_active": j.is_active,
                  "candidate_count": len(j.candidates)} for j in jobs]
    }


@router.get("/candidate")
def candidate_dashboard(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    candidate = CandidateRepository(db).get_by_user_id(current_user.id)
    if not candidate:
        return {"message": "No profile found"}

    return {
        "status": candidate.status,
        "job_title": candidate.job.title if candidate.job else "",
        "overall_score": candidate.overall_score,
        "rank": candidate.rank,
        "resume_uploaded": candidate.resume is not None,
        "resume_score": candidate.resume.match_percentage if candidate.resume else None,
        "assessments": [
            {"type": a.assessment_type, "status": a.status, "percentage": a.percentage}
            for a in candidate.assessments
        ],
        "interview_status": candidate.interview.status if candidate.interview else "not_started",
        "interview_score": candidate.interview.overall_score if candidate.interview else None,
    }
