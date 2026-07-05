from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user, require_hr
from app.services.proctoring_service import ProctoringService
from app.repositories.candidate_repository import CandidateRepository

router = APIRouter(prefix="/proctoring", tags=["Proctoring"])


@router.post("/violation")
def log_violation(payload: dict, db: Session = Depends(get_db),
                  current_user=Depends(get_current_user)):
    if current_user.role != "candidate":
        raise HTTPException(403, "Candidates only")

    candidate = CandidateRepository(db).get_by_user_id(current_user.id)
    if not candidate:
        raise HTTPException(404, "Candidate not found")

    service = ProctoringService(db)
    return service.log_violation(
        candidate.id,
        payload.get("session_type", "unknown"),
        payload.get("violation_type", "unknown"),
        payload.get("description")
    )


@router.get("/violations/{candidate_id}")
def get_violations(candidate_id: int, db: Session = Depends(get_db),
                   current_user=Depends(get_current_user)):
    if current_user.role == "candidate":
        candidate = CandidateRepository(db).get_by_user_id(current_user.id)
        if not candidate or candidate.id != candidate_id:
            raise HTTPException(403, "Access denied")

    service = ProctoringService(db)
    return service.get_violation_report(candidate_id)
