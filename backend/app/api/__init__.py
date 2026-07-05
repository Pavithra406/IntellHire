from fastapi import APIRouter
from app.api.routes import (
    auth, company, jobs, candidates, bulk_candidates,
    resume, assessment, interview, proctoring, ranking, dashboard,
    delete_candidate, question_upload, code_execution, question_bank, coding_bank
)

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(company.router)
api_router.include_router(jobs.router)
api_router.include_router(bulk_candidates.router)
api_router.include_router(delete_candidate.router)
api_router.include_router(candidates.router)
api_router.include_router(resume.router)
api_router.include_router(assessment.router)
api_router.include_router(code_execution.router)
api_router.include_router(interview.router)
api_router.include_router(proctoring.router)
api_router.include_router(ranking.router)
api_router.include_router(dashboard.router)
api_router.include_router(question_upload.router)
api_router.include_router(question_bank.router)
api_router.include_router(coding_bank.router)
