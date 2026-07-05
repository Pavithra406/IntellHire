from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class UserRole(str, enum.Enum):
    hr = "hr"
    candidate = "candidate"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default="candidate", nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    company_profile = relationship("CompanyProfile", back_populates="hr_user", uselist=False)
    created_candidates = relationship("Candidate", foreign_keys="Candidate.created_by_id", back_populates="created_by")
    candidate_profile = relationship("Candidate", foreign_keys="Candidate.user_id", back_populates="user", uselist=False)
