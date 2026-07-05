from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from app.core.database import get_db
from app.core.security import require_hr, get_current_user
from app.models.assessment import Assessment, AssessmentQuestion
from app.repositories.job_repository import JobRepository

router = APIRouter(prefix="/question-bank", tags=["Question Bank"])


class MCQOption(BaseModel):
    label: str
    text: str


class QuestionCreate(BaseModel):
    question_text: str
    correct_answer: str          # A, B, C, or D
    options: List[MCQOption]
    marks: float = 1.0


class QuestionUpdate(BaseModel):
    question_text: Optional[str] = None
    correct_answer: Optional[str] = None
    options: Optional[List[MCQOption]] = None
    marks: Optional[float] = None


def _get_or_create_bank(db: Session, job_id: int, assessment_type: str) -> Assessment:
    bank_type = f"bank_{assessment_type}_{job_id}"
    bank = db.query(Assessment).filter(
        Assessment.candidate_id == None,
        Assessment.assessment_type == bank_type
    ).first()
    if not bank:
        bank = Assessment(candidate_id=None, assessment_type=bank_type, status="bank")
        db.add(bank)
        db.commit()
        db.refresh(bank)
    return bank


@router.get("/{job_id}/{assessment_type}")
def get_questions(job_id: int, assessment_type: str,
                  db: Session = Depends(get_db), hr=Depends(require_hr)):
    job = JobRepository(db).get_by_id(job_id)
    if not job or job.hr_user_id != hr.id:
        raise HTTPException(403, "Access denied")

    bank = _get_or_create_bank(db, job_id, assessment_type)
    questions = db.query(AssessmentQuestion).filter(
        AssessmentQuestion.assessment_id == bank.id
    ).all()

    return [
        {
            "id": q.id,
            "question_text": q.question_text,
            "question_type": q.question_type,
            "options": q.options,
            "correct_answer": q.correct_answer,
            "marks": q.marks
        }
        for q in questions
    ]


@router.post("/{job_id}/{assessment_type}")
def add_question(job_id: int, assessment_type: str, data: QuestionCreate,
                 db: Session = Depends(get_db), hr=Depends(require_hr)):
    job = JobRepository(db).get_by_id(job_id)
    if not job or job.hr_user_id != hr.id:
        raise HTTPException(403, "Access denied")
    if assessment_type not in ["aptitude", "sql"]:
        raise HTTPException(400, "Only aptitude and sql MCQ supported for manual entry")

    bank = _get_or_create_bank(db, job_id, assessment_type)
    q = AssessmentQuestion(
        assessment_id=bank.id,
        question_text=data.question_text,
        question_type="mcq",
        options=[o.model_dump() for o in data.options],
        correct_answer=data.correct_answer.upper(),
        marks=data.marks
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    return {"id": q.id, "question_text": q.question_text, "options": q.options,
            "correct_answer": q.correct_answer, "marks": q.marks}


@router.put("/{question_id}")
def update_question(question_id: int, data: QuestionUpdate,
                    db: Session = Depends(get_db), hr=Depends(require_hr)):
    q = db.query(AssessmentQuestion).filter(AssessmentQuestion.id == question_id).first()
    if not q:
        raise HTTPException(404, "Question not found")
    if data.question_text is not None:
        q.question_text = data.question_text
    if data.correct_answer is not None:
        q.correct_answer = data.correct_answer.upper()
    if data.options is not None:
        q.options = [o.model_dump() for o in data.options]
    if data.marks is not None:
        q.marks = data.marks
    db.commit()
    db.refresh(q)
    return {"id": q.id, "question_text": q.question_text, "correct_answer": q.correct_answer}


@router.delete("/{question_id}")
def delete_question(question_id: int, db: Session = Depends(get_db), hr=Depends(require_hr)):
    q = db.query(AssessmentQuestion).filter(AssessmentQuestion.id == question_id).first()
    if not q:
        raise HTTPException(404, "Question not found")
    db.delete(q)
    db.commit()
    return {"message": "Deleted"}
