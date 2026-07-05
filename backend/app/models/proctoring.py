from sqlalchemy import Column, Integer, String, Text, JSON, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class ProctoringViolation(Base):
    __tablename__ = "proctoring_violations"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    session_type = Column(String, nullable=False)  # aptitude, sql, coding, interview
    violation_type = Column(String, nullable=False)  # tab_switch, fullscreen_exit, refresh, disconnect
    description = Column(Text)
    screenshot_path = Column(String)
    occurred_at = Column(DateTime(timezone=True), server_default=func.now())

    candidate = relationship("Candidate", back_populates="violations")
