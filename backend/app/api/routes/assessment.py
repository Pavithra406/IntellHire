from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user, require_hr
from app.services.assessment_service import AssessmentService
from app.repositories.candidate_repository import CandidateRepository
from app.repositories.assessment_repository import AssessmentRepository

router = APIRouter(prefix="/assessment", tags=["Assessment"])

STATUS_TO_TYPE = {
    "aptitude_pending": "aptitude",
    "sql_pending": "sql",
    "coding_pending": "coding"
}


@router.post("/start/{assessment_type}")
def start_assessment(assessment_type: str, db: Session = Depends(get_db),
                     current_user=Depends(get_current_user)):
    if current_user.role != "candidate":
        raise HTTPException(403, "Candidates only")
    if assessment_type not in ["aptitude", "sql", "coding"]:
        raise HTTPException(400, "Invalid assessment type")

    candidate = CandidateRepository(db).get_by_user_id(current_user.id)
    if not candidate:
        raise HTTPException(404, "Candidate not found")

    # Check eligibility
    required_status = f"{assessment_type}_pending"
    if candidate.status not in [required_status, "interview_pending"] and \
       candidate.status != required_status:
        # Allow retry logic - check if already in appropriate state
        if candidate.status != required_status:
            raise HTTPException(400, f"Not eligible for {assessment_type}. Current status: {candidate.status}")

    service = AssessmentService(db)
    return service.create_assessment(candidate.id, assessment_type)


@router.post("/submit/{assessment_id}")
def submit_assessment(assessment_id: int, payload: dict,
                      db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role != "candidate":
        raise HTTPException(403, "Candidates only")

    candidate = CandidateRepository(db).get_by_user_id(current_user.id)
    if not candidate:
        raise HTTPException(404, "Candidate not found")

    service = AssessmentService(db)
    answers = payload.get("answers", [])
    return service.submit_assessment(assessment_id, candidate.id, answers)


@router.get("/my")
def my_assessments(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role != "candidate":
        raise HTTPException(403, "Candidates only")
    candidate = CandidateRepository(db).get_by_user_id(current_user.id)
    if not candidate:
        raise HTTPException(404, "Candidate not found")
    assessments = AssessmentRepository(db).get_all_by_candidate(candidate.id)
    return [
        {"id": a.id, "type": a.assessment_type, "status": a.status,
         "percentage": a.percentage, "completed_at": a.completed_at}
        for a in assessments
    ]


@router.get("/{assessment_id}")
def get_assessment(assessment_id: int, db: Session = Depends(get_db),
                   current_user=Depends(get_current_user)):
    assessment = AssessmentRepository(db).get_by_id(assessment_id)
    if not assessment:
        raise HTTPException(404, "Assessment not found")

    # Security: candidates can only see their own
    if current_user.role == "candidate":
        candidate = CandidateRepository(db).get_by_user_id(current_user.id)
        if not candidate or assessment.candidate_id != candidate.id:
            raise HTTPException(403, "Access denied")

    questions = []
    for q in assessment.questions:
        qdata = {
            "id": q.id,
            "question_text": q.question_text,
            "question_type": q.question_type,
            "options": q.options,
            "marks": q.marks
        }
        # Only show correct answers to HR
        if current_user.role == "hr":
            qdata["correct_answer"] = q.correct_answer
            qdata["candidate_answer"] = q.candidate_answer
            qdata["is_correct"] = q.is_correct
            qdata["marks_obtained"] = q.marks_obtained
        questions.append(qdata)

    return {
        "id": assessment.id,
        "type": assessment.assessment_type,
        "status": assessment.status,
        "score": assessment.score,
        "total_marks": assessment.total_marks,
        "percentage": assessment.percentage,
        "started_at": assessment.started_at,
        "completed_at": assessment.completed_at,
        "questions": questions
    }
