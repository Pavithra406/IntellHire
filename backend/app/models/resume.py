from sqlalchemy import Column, Integer, String, Text, Float, JSON, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), unique=True, nullable=False)
    file_path = Column(String, nullable=False)
    file_name = Column(String, nullable=False)

    # Extracted info
    extracted_name = Column(String)
    extracted_email = Column(String)
    extracted_phone = Column(String)
    extracted_skills = Column(JSON, default=[])
    extracted_experience = Column(JSON, default=[])
    extracted_education = Column(JSON, default=[])
    extracted_projects = Column(JSON, default=[])
    extracted_certifications = Column(JSON, default=[])
    raw_text = Column(Text)

    # Screening result
    match_percentage = Column(Float)
    missing_skills = Column(JSON, default=[])
    strengths = Column(JSON, default=[])
    weaknesses = Column(JSON, default=[])
    recommendations = Column(Text)
    screening_status = Column(String, default="pending")  # pending, passed, failed

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    candidate = relationship("Candidate", back_populates="resume")
