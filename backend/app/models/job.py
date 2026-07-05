from sqlalchemy import Column, Integer, String, Text, Float, JSON, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class JobOpening(Base):
    __tablename__ = "job_openings"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("company_profiles.id"), nullable=False)
    hr_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    required_skills = Column(JSON, default=[])
    experience_years = Column(String)
    qualification = Column(String)
    salary_range = Column(String)
    interview_rounds = Column(JSON, default=[])
    resume_cutoff = Column(Float, default=60.0)
    aptitude_cutoff = Column(Float, default=60.0)
    sql_cutoff = Column(Float, default=60.0)
    coding_cutoff = Column(Float, default=60.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    company = relationship("CompanyProfile", back_populates="job_openings")
    hr_user = relationship("User")
    candidates = relationship("Candidate", back_populates="job")
    interview_questions = relationship("InterviewQuestion", back_populates="job")
