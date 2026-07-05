from sqlalchemy.orm import Session, joinedload
from app.models.interview import Interview, InterviewAnswer, InterviewQuestion
from datetime import datetime
from typing import Optional, List


class InterviewRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_interview(self, candidate_id: int) -> Interview:
        interview = Interview(candidate_id=candidate_id)
        self.db.add(interview)
        self.db.commit()
        self.db.refresh(interview)
        return interview

    def get_by_candidate(self, candidate_id: int) -> Optional[Interview]:
        return self.db.query(Interview).options(
            joinedload(Interview.answers)
        ).filter(Interview.candidate_id == candidate_id).first()

    def get_by_id(self, interview_id: int) -> Optional[Interview]:
        return self.db.query(Interview).options(
            joinedload(Interview.answers)
        ).filter(Interview.id == interview_id).first()

    def start(self, interview_id: int) -> Interview:
        i = self.db.query(Interview).filter(Interview.id == interview_id).first()
        i.status = "in_progress"
        i.started_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(i)
        return i

    def add_answer(self, interview_id: int, question_text: str, answer_text: str,
                   sequence_order: int, audio_path: str = None) -> InterviewAnswer:
        answer = InterviewAnswer(
            interview_id=interview_id,
            question_text=question_text,
            answer_text=answer_text,
            sequence_order=sequence_order,
            audio_path=audio_path
        )
        self.db.add(answer)
        self.db.commit()
        self.db.refresh(answer)
        return answer

    def update_answer_eval(self, answer_id: int, score: float, evaluation: dict):
        a = self.db.query(InterviewAnswer).filter(InterviewAnswer.id == answer_id).first()
        a.score = score
        a.evaluation = evaluation
        self.db.commit()

    def complete(self, interview_id: int, scores: dict, transcript: list,
                 strengths: list, weaknesses: list, suggestions: list, ai_feedback: str):
        i = self.db.query(Interview).filter(Interview.id == interview_id).first()
        i.status = "completed"
        i.completed_at = datetime.utcnow()
        i.transcript = transcript
        i.overall_score = scores.get("overall_score")
        i.technical_score = scores.get("technical_score")
        i.communication_score = scores.get("communication_score")
        i.confidence_score = scores.get("confidence_score")
        i.grammar_score = scores.get("grammar_score")
        i.problem_solving_score = scores.get("problem_solving_score")
        i.keyword_coverage_score = scores.get("keyword_coverage_score")
        i.strengths = strengths
        i.weaknesses = weaknesses
        i.suggestions = suggestions
        i.ai_feedback = ai_feedback
        self.db.commit()
        self.db.refresh(i)
        return i

    def save_recordings(self, interview_id: int, voice_path: str = None, camera_path: str = None):
        i = self.db.query(Interview).filter(Interview.id == interview_id).first()
        if voice_path:
            i.voice_recording_path = voice_path
        if camera_path:
            i.camera_recording_path = camera_path
        self.db.commit()

    # Interview Questions
    def get_questions_for_job(self, job_id: int) -> List[InterviewQuestion]:
        return self.db.query(InterviewQuestion).filter(
            InterviewQuestion.job_id == job_id,
            InterviewQuestion.is_active == True
        ).all()

    def create_question(self, job_id: int, text: str, qtype: str, difficulty: str) -> InterviewQuestion:
        q = InterviewQuestion(job_id=job_id, question_text=text, question_type=qtype, difficulty=difficulty)
        self.db.add(q)
        self.db.commit()
        self.db.refresh(q)
        return q

    def update_question(self, question_id: int, data: dict) -> InterviewQuestion:
        q = self.db.query(InterviewQuestion).filter(InterviewQuestion.id == question_id).first()
        for k, v in data.items():
            if v is not None:
                setattr(q, k, v)
        self.db.commit()
        self.db.refresh(q)
        return q

    def delete_question(self, question_id: int):
        q = self.db.query(InterviewQuestion).filter(InterviewQuestion.id == question_id).first()
        if q:
            q.is_active = False
            self.db.commit()

    def bulk_create_questions(self, job_id: int, questions: list) -> List[InterviewQuestion]:
        created = []
        for qdata in questions:
            q = InterviewQuestion(
                job_id=job_id,
                question_text=qdata["question_text"],
                question_type=qdata["question_type"],
                difficulty=qdata.get("difficulty", "medium")
            )
            self.db.add(q)
            created.append(q)
        self.db.commit()
        return created
