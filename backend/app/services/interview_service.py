from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.repositories.interview_repository import InterviewRepository
from app.repositories.candidate_repository import CandidateRepository
from app.repositories.job_repository import JobRepository
from app.repositories.resume_repository import ResumeRepository
from app.agents.question_generator_agent import QuestionGeneratorAgent
from app.agents.answer_evaluation_agent import AnswerEvaluationAgent


class InterviewService:
    def __init__(self, db: Session):
        self.db = db
        self.interview_repo = InterviewRepository(db)
        self.candidate_repo = CandidateRepository(db)
        self.job_repo = JobRepository(db)
        self.resume_repo = ResumeRepository(db)
        self.question_gen = QuestionGeneratorAgent()
        self.evaluator = AnswerEvaluationAgent()

    def generate_questions_for_job(self, job_id: int, candidate_id: int = None,
                                   num_questions: int = 10) -> list:
        job = self.job_repo.get_by_id(job_id)
        if not job:
            raise HTTPException(404, "Job not found")

        candidate_info = {"skills": [], "experience": ""}
        if candidate_id:
            resume = self.resume_repo.get_by_candidate(candidate_id)
            if resume:
                candidate_info["skills"] = resume.extracted_skills or []
                exp = resume.extracted_experience or []
                candidate_info["experience"] = str(exp[0]) if exp else ""

        job_dict = {
            "title": job.title,
            "description": job.description,
            "required_skills": job.required_skills or []
        }
        questions = self.question_gen.generate_questions(job_dict, candidate_info, num_questions)

        # Deactivate old questions
        old_questions = self.interview_repo.get_questions_for_job(job_id)
        for q in old_questions:
            self.interview_repo.delete_question(q.id)

        # Save new questions
        saved = self.interview_repo.bulk_create_questions(job_id, questions)
        return [{"id": q.id, "question_text": q.question_text,
                 "question_type": q.question_type, "difficulty": q.difficulty}
                for q in saved]

    def start_interview(self, candidate_id: int) -> dict:
        candidate = self.candidate_repo.get_by_id(candidate_id)
        if not candidate:
            raise HTTPException(404, "Candidate not found")
        if candidate.status not in ["interview_pending", "coding_failed"]:
            raise HTTPException(400, f"Candidate not eligible for interview. Status: {candidate.status}")

        existing = self.interview_repo.get_by_candidate(candidate_id)
        if existing and existing.status == "completed":
            raise HTTPException(400, "Interview already completed")

        if not existing:
            interview = self.interview_repo.create_interview(candidate_id)
        else:
            interview = existing

        self.interview_repo.start(interview.id)
        self.candidate_repo.update_status(candidate_id, "interview_pending")

        # Get questions for the job
        questions = self.interview_repo.get_questions_for_job(candidate.job_id)
        if not questions:
            # Auto-generate if none exist
            self.generate_questions_for_job(candidate.job_id, candidate_id, num_questions=10)
            questions = self.interview_repo.get_questions_for_job(candidate.job_id)

        return {
            "interview_id": interview.id,
            "questions": [
                {"id": q.id, "question_text": q.question_text,
                 "question_type": q.question_type, "difficulty": q.difficulty}
                for q in questions[:10]
            ]
        }

    def submit_answer(self, interview_id: int, candidate_id: int,
                      question_text: str, answer_text: str, sequence_order: int) -> dict:
        interview = self.interview_repo.get_by_id(interview_id)
        if not interview:
            raise HTTPException(404, "Interview not found")
        if interview.candidate_id != candidate_id:
            raise HTTPException(403, "Forbidden")

        # Save answer
        answer = self.interview_repo.add_answer(
            interview_id, question_text, answer_text, sequence_order
        )

        # Evaluate answer
        evaluation = self.evaluator.evaluate_answer(question_text, answer_text, "technical")
        self.interview_repo.update_answer_eval(answer.id, evaluation.get("overall_score", 0) / 10, evaluation)

        # Generate follow-up
        context = [{"q": a.question_text, "a": a.answer_text}
                   for a in interview.answers[-3:]]
        followup = self.question_gen.generate_followup(question_text, answer_text, context)

        return {
            "answer_id": answer.id,
            "evaluation": evaluation,
            "follow_up_question": followup
        }

    def complete_interview(self, interview_id: int, candidate_id: int) -> dict:
        interview = self.interview_repo.get_by_id(interview_id)
        if not interview:
            raise HTTPException(404, "Interview not found")
        if interview.candidate_id != candidate_id:
            raise HTTPException(403, "Forbidden")

        answers = interview.answers
        answers_data = [
            {"question_text": a.question_text, "answer_text": a.answer_text, "score": a.score}
            for a in answers
        ]

        final_eval = self.evaluator.evaluate_full_interview(answers_data)

        transcript = [
            {"sequence": a.sequence_order, "question": a.question_text,
             "answer": a.answer_text, "score": a.score}
            for a in sorted(answers, key=lambda x: x.sequence_order or 0)
        ]

        scores = {
            "overall_score": final_eval.get("overall_score"),
            "technical_score": final_eval.get("technical_score"),
            "communication_score": final_eval.get("communication_score"),
            "confidence_score": final_eval.get("confidence_score"),
            "grammar_score": final_eval.get("grammar_score"),
            "problem_solving_score": final_eval.get("problem_solving_score"),
            "keyword_coverage_score": final_eval.get("keyword_coverage_score")
        }

        self.interview_repo.complete(
            interview_id, scores, transcript,
            final_eval.get("strengths", []),
            final_eval.get("weaknesses", []),
            final_eval.get("suggestions", []),
            final_eval.get("ai_feedback", "")
        )

        self.candidate_repo.update_status(candidate_id, "interview_completed")

        return {"interview_id": interview_id, "scores": scores, "evaluation": final_eval}
