from sqlalchemy import Column, Integer, String, Text, Float, JSON, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("job_openings.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    question_type = Column(String, nullable=False)  # technical, coding, behavioral, scenario, hr
    difficulty = Column(String, default="medium")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    job = relationship("JobOpening", back_populates="interview_questions")


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), unique=True, nullable=False)
    status = Column(String, default="pending")  # pending, in_progress, completed
    transcript = Column(JSON, default=[])
    voice_recording_path = Column(String)
    camera_recording_path = Column(String)
    overall_score = Column(Float)
    technical_score = Column(Float)
    communication_score = Column(Float)
    confidence_score = Column(Float)
    grammar_score = Column(Float)
    problem_solving_score = Column(Float)
    keyword_coverage_score = Column(Float)
    strengths = Column(JSON, default=[])
    weaknesses = Column(JSON, default=[])
    suggestions = Column(JSON, default=[])
    ai_feedback = Column(Text)
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    candidate = relationship("Candidate", back_populates="interview")
    answers = relationship("InterviewAnswer", back_populates="interview")


class InterviewAnswer(Base):
    __tablename__ = "interview_answers"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    answer_text = Column(Text)
    audio_path = Column(String)
    score = Column(Float)
    evaluation = Column(JSON)
    sequence_order = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    interview = relationship("Interview", back_populates="answers")
