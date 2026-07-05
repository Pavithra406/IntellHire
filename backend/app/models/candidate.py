from sqlalchemy import Column, Integer, String, Text, Float, JSON, ForeignKey, DateTime, Boolean, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class CandidateStatus(str, enum.Enum):
    pending = "pending"
    resume_screening = "resume_screening"
    resume_rejected = "resume_rejected"
    aptitude_pending = "aptitude_pending"
    aptitude_failed = "aptitude_failed"
    sql_pending = "sql_pending"
    sql_failed = "sql_failed"
    coding_pending = "coding_pending"
    coding_failed = "coding_failed"
    interview_pending = "interview_pending"
    interview_completed = "interview_completed"
    shortlisted = "shortlisted"
    hired = "hired"
    rejected = "rejected"


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("job_openings.id"), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="pending")
    overall_score = Column(Float, default=0.0)
    rank = Column(Integer, nullable=True)
    hr_notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", foreign_keys=[user_id], back_populates="candidate_profile")
    created_by = relationship("User", foreign_keys=[created_by_id], back_populates="created_candidates")
    job = relationship("JobOpening", back_populates="candidates")
    resume = relationship("Resume", back_populates="candidate", uselist=False)
    assessments = relationship("Assessment", back_populates="candidate")
    interview = relationship("Interview", back_populates="candidate", uselist=False)
    violations = relationship("ProctoringViolation", back_populates="candidate")
    ranking = relationship("CandidateRanking", back_populates="candidate", uselist=False)
