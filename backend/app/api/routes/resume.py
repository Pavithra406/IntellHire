from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user, require_hr
from app.services.resume_service import ResumeService
from app.repositories.candidate_repository import CandidateRepository
from app.repositories.resume_repository import ResumeRepository

router = APIRouter(prefix="/resume", tags=["Resume"])


@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if current_user.role != "candidate":
        raise HTTPException(403, "Candidates only")

    candidate_repo = CandidateRepository(db)
    candidate = candidate_repo.get_by_user_id(current_user.id)
    if not candidate:
        raise HTTPException(404, "Candidate profile not found")

    service = ResumeService(db)
    result = await service.upload_and_process(candidate.id, file)
    return result


@router.get("/{candidate_id}")
def get_resume(candidate_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    # Candidates can only see their own resume
    if current_user.role == "candidate":
        candidate = CandidateRepository(db).get_by_user_id(current_user.id)
        if not candidate or candidate.id != candidate_id:
            raise HTTPException(403, "Access denied")

    resume = ResumeRepository(db).get_by_candidate(candidate_id)
    if not resume:
        raise HTTPException(404, "Resume not found")

    return {
        "id": resume.id,
        "file_name": resume.file_name,
        "extracted_name": resume.extracted_name,
        "extracted_email": resume.extracted_email,
        "extracted_phone": resume.extracted_phone,
        "extracted_skills": resume.extracted_skills,
        "extracted_experience": resume.extracted_experience,
        "extracted_education": resume.extracted_education,
        "extracted_projects": resume.extracted_projects,
        "extracted_certifications": resume.extracted_certifications,
        "match_percentage": resume.match_percentage,
        "missing_skills": resume.missing_skills,
        "strengths": resume.strengths,
        "weaknesses": resume.weaknesses,
        "recommendations": resume.recommendations,
        "screening_status": resume.screening_status,
    }
