from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class JobCreate(BaseModel):
    title: str
    description: str
    required_skills: List[str] = []
    experience_years: Optional[str] = None
    qualification: Optional[str] = None
    salary_range: Optional[str] = None
    interview_rounds: List[str] = []
    resume_cutoff: float = 60.0
    aptitude_cutoff: float = 60.0
    sql_cutoff: float = 60.0
    coding_cutoff: float = 60.0


class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    required_skills: Optional[List[str]] = None
    experience_years: Optional[str] = None
    qualification: Optional[str] = None
    salary_range: Optional[str] = None
    resume_cutoff: Optional[float] = None
    aptitude_cutoff: Optional[float] = None
    sql_cutoff: Optional[float] = None
    coding_cutoff: Optional[float] = None
    is_active: Optional[bool] = None


class JobOut(BaseModel):
    id: int
    title: str
    description: str
    required_skills: List[str]
    experience_years: Optional[str]
    qualification: Optional[str]
    salary_range: Optional[str]
    interview_rounds: List[str]
    resume_cutoff: float
    aptitude_cutoff: float
    sql_cutoff: float
    coding_cutoff: float
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
