from sqlalchemy import Column, Integer, Float, JSON, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class CandidateRanking(Base):
    __tablename__ = "candidate_rankings"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), unique=True, nullable=False)
    job_id = Column(Integer, ForeignKey("job_openings.id"), nullable=False)
    resume_score = Column(Float, default=0.0)
    aptitude_score = Column(Float, default=0.0)
    sql_score = Column(Float, default=0.0)
    coding_score = Column(Float, default=0.0)
    interview_score = Column(Float, default=0.0)
    violation_penalty = Column(Float, default=0.0)
    overall_score = Column(Float, default=0.0)
    rank = Column(Integer)
    score_breakdown = Column(JSON)
    ai_recommendation = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    candidate = relationship("Candidate", back_populates="ranking")
