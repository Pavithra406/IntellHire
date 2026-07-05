from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_user
from app.services.code_runner import execute_code, run_against_test_cases
from app.repositories.assessment_repository import AssessmentRepository
from app.repositories.candidate_repository import CandidateRepository

router = APIRouter(prefix="/code", tags=["Code Execution"])


class RunCodeRequest(BaseModel):
    code: str
    language: str        # python, java, c
    stdin: Optional[str] = ""


class SubmitCodeRequest(BaseModel):
    assessment_id: int
    question_id: int
    code: str
    language: str


class TestCase(BaseModel):
    input: str
    expected_output: str
    is_hidden: bool = False


class RunWithTestsRequest(BaseModel):
    code: str
    language: str
    test_cases: List[TestCase]


@router.post("/run")
def run_code(req: RunCodeRequest, current_user=Depends(get_current_user)):
    """Run code with custom stdin — for candidate testing before submit."""
    if not req.code.strip():
        raise HTTPException(400, "Code cannot be empty")
    result = execute_code(req.code, req.language, req.stdin or "")
    return {
        "stdout": result["stdout"],
        "stderr": result["stderr"],
        "exit_code": result["exit_code"],
        "language": req.language
    }


@router.post("/run-tests")
def run_with_tests(req: RunWithTestsRequest, current_user=Depends(get_current_user)):
    """Run code against provided test cases."""
    if not req.code.strip():
        raise HTTPException(400, "Code cannot be empty")
    test_cases = [tc.model_dump() for tc in req.test_cases]
    result = run_against_test_cases(req.code, req.language, test_cases)
    return result


@router.post("/submit")
def submit_code(req: SubmitCodeRequest, db: Session = Depends(get_db),
                current_user=Depends(get_current_user)):
    """Submit final code solution — runs against all test cases including hidden."""
    assess_repo = AssessmentRepository(db)
    candidate_repo = CandidateRepository(db)

    assessment = assess_repo.get_by_id(req.assessment_id)
    if not assessment:
        raise HTTPException(404, "Assessment not found")

    # Security: only the candidate who owns this assessment
    if current_user.role == "candidate":
        candidate = candidate_repo.get_by_user_id(current_user.id)
        if not candidate or assessment.candidate_id != candidate.id:
            raise HTTPException(403, "Access denied")

    # Find the question
    question = next((q for q in assessment.questions if q.id == req.question_id), None)
    if not question:
        raise HTTPException(404, "Question not found")

    # Get test cases from question options field
    test_cases = []
    if question.options and isinstance(question.options, list):
        for tc in question.options:
            if isinstance(tc, dict) and "input" in tc:
                test_cases.append(tc)

    # If no test cases stored, run with empty stdin and compare to correct_answer
    if not test_cases and question.correct_answer:
        test_cases = [{"input": "", "expected_output": question.correct_answer.strip(), "is_hidden": False}]

    if not test_cases:
        # Just run the code and return output
        result = execute_code(req.code, req.language, "")
        score_ratio = 0.5  # Partial credit if code runs without error
        if result["exit_code"] == 0:
            score_ratio = 0.7
        marks = question.marks * score_ratio
        assess_repo.submit_answer(req.question_id, req.code, False, marks, {
            "output": result["stdout"], "error": result["stderr"], "score_ratio": score_ratio
        })
        return {"passed": 0, "total": 0, "score_ratio": score_ratio,
                "output": result["stdout"], "error": result["stderr"]}

    # Run against all test cases
    run_result = run_against_test_cases(req.code, req.language, test_cases)
    marks = question.marks * run_result["score_ratio"]
    is_correct = run_result["score_ratio"] >= 0.5

    assess_repo.submit_answer(req.question_id, req.code, is_correct, marks, {
        "language": req.language,
        "passed": run_result["passed"],
        "total": run_result["total"],
        "score_ratio": run_result["score_ratio"],
        "results": run_result["results"]
    })

    return {
        "passed": run_result["passed"],
        "total": run_result["total"],
        "percentage": run_result["percentage"],
        "score_ratio": run_result["score_ratio"],
        "marks_obtained": marks,
        "results": run_result["results"]
    }
