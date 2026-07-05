from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class CandidateOut(BaseModel):
    id: int
    user_id: int
    job_id: int
    status: str
    overall_score: Optional[float]
    rank: Optional[int]
    hr_notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class CandidateDetail(CandidateOut):
    full_name: str
    email: str
    job_title: str


class HRAction(BaseModel):
    action: str  # shortlist, reject, hire, schedule_next
    notes: Optional[str] = None


class CandidateStatusUpdate(BaseModel):
    status: str
    hr_notes: Optional[str] = None
