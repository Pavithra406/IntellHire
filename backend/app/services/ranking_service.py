from sqlalchemy.orm import Session
from app.repositories.ranking_repository import RankingRepository
from app.repositories.candidate_repository import CandidateRepository
from app.repositories.resume_repository import ResumeRepository
from app.repositories.assessment_repository import AssessmentRepository
from app.repositories.interview_repository import InterviewRepository
from app.agents.ranking_agent import RankingAgent


class RankingService:
    def __init__(self, db: Session):
        self.db = db
        self.ranking_repo = RankingRepository(db)
        self.candidate_repo = CandidateRepository(db)
        self.resume_repo = ResumeRepository(db)
        self.assess_repo = AssessmentRepository(db)
        self.interview_repo = InterviewRepository(db)
        self.agent = RankingAgent()

    def compute_ranking(self, candidate_id: int) -> dict:
        candidate = self.candidate_repo.get_by_id(candidate_id)
        if not candidate:
            return {}

        # Gather scores
        resume = self.resume_repo.get_by_candidate(candidate_id)
        resume_score = resume.match_percentage if resume else 0.0

        aptitude = self.assess_repo.get_by_candidate_and_type(candidate_id, "aptitude")
        aptitude_score = aptitude.percentage if aptitude else 0.0

        sql = self.assess_repo.get_by_candidate_and_type(candidate_id, "sql")
        sql_score = sql.percentage if sql else 0.0

        coding = self.assess_repo.get_by_candidate_and_type(candidate_id, "coding")
        coding_score = coding.percentage if coding else 0.0

        interview = self.interview_repo.get_by_candidate(candidate_id)
        interview_score = interview.overall_score if interview else 0.0

        violation_count = len(candidate.violations)

        scores = {
            "resume_score": resume_score,
            "aptitude_score": aptitude_score,
            "sql_score": sql_score,
            "coding_score": coding_score,
            "interview_score": interview_score,
        }

        result = self.agent.calculate_ranking(scores, violation_count)

        # Save ranking
        self.ranking_repo.upsert(candidate_id, candidate.job_id, {
            "resume_score": resume_score,
            "aptitude_score": aptitude_score,
            "sql_score": sql_score,
            "coding_score": coding_score,
            "interview_score": interview_score,
            "violation_penalty": result.get("violation_penalty", 0),
            "overall_score": result.get("overall_score", 0),
            "score_breakdown": result.get("score_breakdown", {}),
            "ai_recommendation": {
                "recommendation": result.get("recommendation"),
                "reason": result.get("recommendation_reason"),
                "strengths": result.get("strengths", []),
                "concerns": result.get("concerns", [])
            }
        })

        # Update ranks for all candidates in this job
        self.ranking_repo.update_ranks(candidate.job_id)

        # Update candidate overall score
        ranking = self.ranking_repo.get_by_candidate(candidate_id)
        self.candidate_repo.update_score(candidate_id, result.get("overall_score", 0), ranking.rank)

        return result
