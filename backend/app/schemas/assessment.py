from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class MCQOption(BaseModel):
    label: str
    text: str


class AssessmentQuestionOut(BaseModel):
    id: int
    question_text: str
    question_type: str
    options: Optional[List[Any]]
    marks: float

    class Config:
        from_attributes = True


class AssessmentOut(BaseModel):
    id: int
    candidate_id: int
    assessment_type: str
    status: str
    score: Optional[float]
    percentage: Optional[float]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class SubmitMCQAnswer(BaseModel):
    question_id: int
    answer: str


class SubmitSQLAnswer(BaseModel):
    question_id: int
    sql_query: str


class SubmitCodingAnswer(BaseModel):
    question_id: int
    code: str
    language: str


class AssessmentSubmit(BaseModel):
    assessment_id: int
    answers: List[dict]


class CodeExecuteRequest(BaseModel):
    code: str
    language: str  # python, java, javascript
    stdin: Optional[str] = ""
