from sqlalchemy import Column, Integer, String, Text, JSON, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


class AnswerKey(Base):
    __tablename__ = "answer_keys"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("job_openings.id"), nullable=False)
    assessment_type = Column(String, nullable=False)   # aptitude, sql, coding
    answer_type = Column(String, default="mcq")        # mcq, text
    # Stored as {question_number: answer} dict
    answers = Column(JSON, nullable=False, default={})
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
