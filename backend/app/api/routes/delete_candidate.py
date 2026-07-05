import os, shutil
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_hr
from app.models.ranking import CandidateRanking
from app.models.proctoring import ProctoringViolation
from app.models.interview import Interview, InterviewAnswer
from app.models.assessment import Assessment, AssessmentQuestion
from app.models.resume import Resume
from app.models.candidate import Candidate
from app.models.user import User
from app.repositories.job_repository import JobRepository

router = APIRouter(prefix="/candidates", tags=["Candidates"])


@router.delete("/{candidate_id}")
def delete_candidate(candidate_id: int, db: Session = Depends(get_db), hr=Depends(require_hr)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(404, "Candidate not found")

    # Ensure this candidate belongs to the HR's job
    job = JobRepository(db).get_by_id(candidate.job_id)
    if not job or job.hr_user_id != hr.id:
        raise HTTPException(403, "Access denied")

    user_id = candidate.user_id

    # Delete in dependency order
    db.query(CandidateRanking).filter(CandidateRanking.candidate_id == candidate_id).delete()
    db.query(ProctoringViolation).filter(ProctoringViolation.candidate_id == candidate_id).delete()

    interview = db.query(Interview).filter(Interview.candidate_id == candidate_id).first()
    if interview:
        db.query(InterviewAnswer).filter(InterviewAnswer.interview_id == interview.id).delete()
        db.delete(interview)

    assessments = db.query(Assessment).filter(Assessment.candidate_id == candidate_id).all()
    for a in assessments:
        db.query(AssessmentQuestion).filter(AssessmentQuestion.assessment_id == a.id).delete()
        db.delete(a)

    resume = db.query(Resume).filter(Resume.candidate_id == candidate_id).first()
    if resume:
        # Remove uploaded files
        upload_dir = os.path.join("uploads", "resumes", str(candidate_id))
        if os.path.exists(upload_dir):
            shutil.rmtree(upload_dir)
        db.delete(resume)

    # Remove recording files
    rec_dir = os.path.join("uploads", "recordings", str(candidate_id))
    if os.path.exists(rec_dir):
        shutil.rmtree(rec_dir)

    db.delete(candidate)

    # Delete the candidate user account
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        db.delete(user)

    db.commit()
    return {"message": "Candidate deleted successfully"}
