from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class InterviewQuestionCreate(BaseModel):
    job_id: int
    question_text: str
    question_type: str
    difficulty: str = "medium"


class InterviewQuestionOut(BaseModel):
    id: int
    question_text: str
    question_type: str
    difficulty: str

    class Config:
        from_attributes = True


class InterviewQuestionUpdate(BaseModel):
    question_text: Optional[str] = None
    question_type: Optional[str] = None
    difficulty: Optional[str] = None


class InterviewAnswerSubmit(BaseModel):
    question_text: str
    answer_text: str
    sequence_order: int


class InterviewOut(BaseModel):
    id: int
    candidate_id: int
    status: str
    overall_score: Optional[float]
    technical_score: Optional[float]
    communication_score: Optional[float]
    ai_feedback: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class GenerateQuestionsRequest(BaseModel):
    job_id: int
    candidate_id: Optional[int] = None
    num_questions: int = 10
