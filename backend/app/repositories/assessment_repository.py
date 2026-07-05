from sqlalchemy.orm import Session, joinedload
from app.models.assessment import Assessment, AssessmentQuestion
from datetime import datetime
from typing import Optional, List


class AssessmentRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, candidate_id: int, assessment_type: str) -> Assessment:
        a = Assessment(candidate_id=candidate_id, assessment_type=assessment_type)
        self.db.add(a)
        self.db.commit()
        self.db.refresh(a)
        return a

    def get_by_id(self, assessment_id: int) -> Optional[Assessment]:
        return self.db.query(Assessment).options(
            joinedload(Assessment.questions)
        ).filter(Assessment.id == assessment_id).first()

    def get_by_candidate_and_type(self, candidate_id: int, atype: str) -> Optional[Assessment]:
        return self.db.query(Assessment).filter(
            Assessment.candidate_id == candidate_id,
            Assessment.assessment_type == atype
        ).first()

    def get_all_by_candidate(self, candidate_id: int) -> List[Assessment]:
        return self.db.query(Assessment).filter(Assessment.candidate_id == candidate_id).all()

    def start(self, assessment_id: int) -> Assessment:
        a = self.db.query(Assessment).filter(Assessment.id == assessment_id).first()
        a.status = "in_progress"
        a.started_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(a)
        return a

    def complete(self, assessment_id: int, score: float, total: float, pct: float,
                 time_taken: int, status: str) -> Assessment:
        a = self.db.query(Assessment).filter(Assessment.id == assessment_id).first()
        a.status = status
        a.score = score
        a.total_marks = total
        a.percentage = pct
        a.time_taken = time_taken
        a.completed_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(a)
        return a

    def add_question(self, assessment_id: int, data: dict) -> AssessmentQuestion:
        q = AssessmentQuestion(assessment_id=assessment_id, **data)
        self.db.add(q)
        self.db.commit()
        self.db.refresh(q)
        return q

    def submit_answer(self, question_id: int, answer: str, is_correct: bool,
                      marks_obtained: float, evaluation: dict = None) -> AssessmentQuestion:
        q = self.db.query(AssessmentQuestion).filter(AssessmentQuestion.id == question_id).first()
        q.candidate_answer = answer
        q.is_correct = is_correct
        q.marks_obtained = marks_obtained
        if evaluation:
            q.evaluation_result = evaluation
        self.db.commit()
        self.db.refresh(q)
        return q
