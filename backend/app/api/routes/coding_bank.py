from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from app.core.database import get_db
from app.core.security import require_hr
from app.models.assessment import Assessment, AssessmentQuestion
from app.repositories.job_repository import JobRepository

router = APIRouter(prefix="/coding-bank", tags=["Coding Question Bank"])


class TestCase(BaseModel):
    input: str
    expected_output: str
    is_hidden: bool = False


class CodingQuestionCreate(BaseModel):
    question_text: str
    marks: float = 10.0
    visible_test_cases: List[TestCase] = []
    hidden_test_cases: List[TestCase] = []


class CodingQuestionUpdate(BaseModel):
    question_text: Optional[str] = None
    marks: Optional[float] = None
    visible_test_cases: Optional[List[TestCase]] = None
    hidden_test_cases: Optional[List[TestCase]] = None


def _get_or_create_bank(db: Session, job_id: int) -> Assessment:
    bank_type = f"bank_coding_{job_id}"
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


@router.get("/{job_id}")
def get_coding_questions(job_id: int, db: Session = Depends(get_db), hr=Depends(require_hr)):
    job = JobRepository(db).get_by_id(job_id)
    if not job or job.hr_user_id != hr.id:
        raise HTTPException(403, "Access denied")

    bank = _get_or_create_bank(db, job_id)
    questions = db.query(AssessmentQuestion).filter(
        AssessmentQuestion.assessment_id == bank.id
    ).all()

    result = []
    for q in questions:
        all_tc = q.options or []
        visible = [tc for tc in all_tc if not tc.get("is_hidden", False)]
        hidden = [tc for tc in all_tc if tc.get("is_hidden", False)]
        result.append({
            "id": q.id,
            "question_text": q.question_text,
            "marks": q.marks,
            "visible_test_cases": visible,
            "hidden_test_cases": hidden,
            "total_test_cases": len(all_tc)
        })
    return result


@router.post("/{job_id}")
def add_coding_question(job_id: int, data: CodingQuestionCreate,
                        db: Session = Depends(get_db), hr=Depends(require_hr)):
    job = JobRepository(db).get_by_id(job_id)
    if not job or job.hr_user_id != hr.id:
        raise HTTPException(403, "Access denied")
    if not data.question_text.strip():
        raise HTTPException(400, "Question text required")

    bank = _get_or_create_bank(db, job_id)

    # Combine visible + hidden test cases
    all_test_cases = (
        [{"input": tc.input, "expected_output": tc.expected_output, "is_hidden": False}
         for tc in data.visible_test_cases] +
        [{"input": tc.input, "expected_output": tc.expected_output, "is_hidden": True}
         for tc in data.hidden_test_cases]
    )

    q = AssessmentQuestion(
        assessment_id=bank.id,
        question_text=data.question_text,
        question_type="coding",
        options=all_test_cases,
        correct_answer=None,
        marks=data.marks
    )
    db.add(q)
    db.commit()
    db.refresh(q)

    return {
        "id": q.id,
        "question_text": q.question_text,
        "marks": q.marks,
        "total_test_cases": len(all_test_cases)
    }


@router.put("/{question_id}")
def update_coding_question(question_id: int, data: CodingQuestionUpdate,
                           db: Session = Depends(get_db), hr=Depends(require_hr)):
    q = db.query(AssessmentQuestion).filter(AssessmentQuestion.id == question_id).first()
    if not q:
        raise HTTPException(404, "Question not found")

    if data.question_text is not None:
        q.question_text = data.question_text
    if data.marks is not None:
        q.marks = data.marks
    if data.visible_test_cases is not None or data.hidden_test_cases is not None:
        visible = data.visible_test_cases or []
        hidden = data.hidden_test_cases or []
        q.options = (
            [{"input": tc.input, "expected_output": tc.expected_output, "is_hidden": False}
             for tc in visible] +
            [{"input": tc.input, "expected_output": tc.expected_output, "is_hidden": True}
             for tc in hidden]
        )

    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(q, "options")
    db.commit()
    db.refresh(q)
    return {"id": q.id, "question_text": q.question_text, "marks": q.marks}


@router.delete("/{question_id}")
def delete_coding_question(question_id: int, db: Session = Depends(get_db), hr=Depends(require_hr)):
    q = db.query(AssessmentQuestion).filter(AssessmentQuestion.id == question_id).first()
    if not q:
        raise HTTPException(404, "Question not found")
    db.delete(q)
    db.commit()
    return {"message": "Deleted"}
