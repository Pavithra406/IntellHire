from sqlalchemy import Column, Integer, String, Text, Float, JSON, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=True)
    assessment_type = Column(String, nullable=False)
    status = Column(String, default="pending")
    score = Column(Float)
    total_marks = Column(Float)
    percentage = Column(Float)
    time_taken = Column(Integer)
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    candidate = relationship("Candidate", back_populates="assessments")
    questions = relationship("AssessmentQuestion", back_populates="assessment")


class AssessmentQuestion(Base):
    __tablename__ = "assessment_questions"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    question_type = Column(String, nullable=False)  # mcq, sql_write, coding
    options = Column(JSON)  # for MCQ
    correct_answer = Column(Text)
    candidate_answer = Column(Text)
    is_correct = Column(Boolean)
    marks = Column(Float, default=1.0)
    marks_obtained = Column(Float, default=0.0)
    evaluation_result = Column(JSON)  # for SQL/coding
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    assessment = relationship("Assessment", back_populates="questions")
