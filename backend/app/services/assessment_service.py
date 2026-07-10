import subprocess
import tempfile
import os
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.repositories.assessment_repository import AssessmentRepository
from app.repositories.candidate_repository import CandidateRepository
from app.repositories.job_repository import JobRepository
from app.agents.assessment_generator_agent import AssessmentGeneratorAgent


class AssessmentService:
    def __init__(self, db: Session):
        self.db = db
        self.assess_repo = AssessmentRepository(db)
        self.candidate_repo = CandidateRepository(db)
        self.job_repo = JobRepository(db)
        self.generator = AssessmentGeneratorAgent()

    def create_assessment(self, candidate_id: int, assessment_type: str) -> dict:
        # Check existing
        existing = self.assess_repo.get_by_candidate_and_type(candidate_id, assessment_type)
        if existing and existing.status in ["completed", "passed"]:
            raise HTTPException(400, f"{assessment_type} assessment already completed")

        assessment = self.assess_repo.create(candidate_id, assessment_type)

        # Check HR question bank first
        hr_questions = self._get_from_question_bank(candidate_id, assessment_type)

        questions = self._build_questions(assessment_type, hr_questions)

        saved_questions = []
        for q in questions:
            saved = self.assess_repo.add_question(assessment.id, {
                "question_text": q.get("question_text", ""),
                "question_type": q.get("question_type", "mcq"),
                "options": q.get("options"),
                "correct_answer": q.get("correct_answer"),
                "marks": q.get("marks", 1.0)
            })
            saved_questions.append({
                "id": saved.id,
                "question_text": saved.question_text,
                "question_type": saved.question_type,
                "options": saved.options,
                "marks": saved.marks
            })

        self.assess_repo.start(assessment.id)
        return {"assessment_id": assessment.id, "questions": saved_questions}

    def ensure_questions(self, assessment_id: int) -> list:
        assessment = self.assess_repo.get_by_id(assessment_id)
        if not assessment:
            raise HTTPException(404, "Assessment not found")

        if assessment.questions:
            return assessment.questions

        questions = self._build_questions(assessment.assessment_type, [])
        saved_questions = []
        for q in questions:
            saved_questions.append(self.assess_repo.add_question(assessment.id, {
                "question_text": q.get("question_text", ""),
                "question_type": q.get("question_type", "mcq"),
                "options": q.get("options"),
                "correct_answer": q.get("correct_answer"),
                "marks": q.get("marks", 1.0)
            }))
        return saved_questions

    def _build_questions(self, assessment_type: str, hr_questions: list) -> list:
        if assessment_type == "aptitude":
            questions = hr_questions or self.generator.generate_aptitude(5)
            return questions or self.generator.generate_aptitude(5)

        if assessment_type == "sql":
            mcqs = [q for q in hr_questions if q.get("question_type") == "mcq"]
            queries = [q for q in hr_questions if q.get("question_type") == "sql_write"]
            if len(mcqs) < 5:
                mcqs.extend(self.generator.generate_sql_mcq(5 - len(mcqs)))
            if len(queries) < 2:
                queries.extend(self.generator.generate_sql_queries(2 - len(queries)))
            return mcqs[:5] + queries[:2]

        if assessment_type == "coding":
            questions = hr_questions or self.generator.generate_coding(2)
            return questions[:2] if questions else self.generator.generate_coding(2)

        raise HTTPException(400, "Invalid assessment type")

    def _get_from_question_bank(self, candidate_id: int, assessment_type: str) -> list:
        """Pull questions from HR-uploaded PDF question bank."""
        from app.models.assessment import Assessment as AssessmentModel, AssessmentQuestion
        candidate = self.candidate_repo.get_by_id(candidate_id)
        if not candidate:
            return []
        job_id = candidate.job_id
        bank_type = f"bank_{assessment_type}_{job_id}"
        bank = self.db.query(AssessmentModel).filter(
            AssessmentModel.candidate_id == None,
            AssessmentModel.assessment_type == bank_type
        ).first()
        if not bank:
            return []
        questions = self.db.query(AssessmentQuestion).filter(
            AssessmentQuestion.assessment_id == bank.id
        ).all()
        return [
            {
                "question_text": q.question_text,
                "question_type": q.question_type,
                "options": q.options,
                "correct_answer": q.correct_answer,
                "marks": q.marks
            }
            for q in questions
        ]

    def submit_assessment(self, assessment_id: int, candidate_id: int, answers: list) -> dict:
        assessment = self.assess_repo.get_by_id(assessment_id)
        if not assessment:
            raise HTTPException(404, "Assessment not found")
        if assessment.candidate_id != candidate_id:
            raise HTTPException(403, "Forbidden")

        total_marks = 0.0
        obtained_marks = 0.0

        for ans in answers:
            q_id = ans.get("question_id")
            submitted = ans.get("answer", "")
            question = next((q for q in assessment.questions if q.id == q_id), None)
            if not question:
                continue

            total_marks += question.marks
            is_correct = False
            marks_obtained = 0.0
            evaluation = {}

            if question.question_type == "mcq":
                is_correct = submitted.strip().upper() == (question.correct_answer or "").strip().upper()
                marks_obtained = question.marks if is_correct else 0.0

            elif question.question_type == "sql_write":
                eval_result = self._evaluate_sql(submitted, question.correct_answer)
                is_correct = eval_result.get("is_correct", False)
                marks_obtained = question.marks * eval_result.get("score_ratio", 0)
                evaluation = eval_result

            elif question.question_type == "coding":
                eval_result = self._evaluate_code(
                    submitted,
                    ans.get("language", "python"),
                    question
                )
                marks_obtained = question.marks * eval_result.get("score_ratio", 0)
                is_correct = eval_result.get("score_ratio", 0) >= 0.5
                evaluation = eval_result

            obtained_marks += marks_obtained
            self.assess_repo.submit_answer(q_id, submitted, is_correct, marks_obtained, evaluation)

        percentage = (obtained_marks / total_marks * 100) if total_marks > 0 else 0

        # Get job cutoff
        candidate = self.candidate_repo.get_by_id(candidate_id)
        job = self.job_repo.get_by_id(candidate.job_id)
        cutoff_map = {
            "aptitude": job.aptitude_cutoff,
            "sql": job.sql_cutoff,
            "coding": job.coding_cutoff
        }
        cutoff = cutoff_map.get(assessment.assessment_type, 60.0)
        status = "passed" if percentage >= cutoff else "failed"

        self.assess_repo.complete(assessment_id, obtained_marks, total_marks, percentage, 0, status)

        # Update candidate status
        next_status_map = {
            "aptitude": {"passed": "sql_pending", "failed": "aptitude_failed"},
            "sql": {"passed": "coding_pending", "failed": "sql_failed"},
            "coding": {"passed": "interview_pending", "failed": "coding_failed"},
        }
        new_status = next_status_map.get(assessment.assessment_type, {}).get(status, candidate.status)
        self.candidate_repo.update_status(candidate_id, new_status)

        return {
            "assessment_id": assessment_id,
            "score": obtained_marks,
            "total": total_marks,
            "percentage": round(percentage, 2),
            "status": status,
            "cutoff": cutoff
        }

    def _evaluate_sql(self, submitted_query: str, correct_query: str) -> dict:
        """Basic SQL evaluation by comparing query structure."""
        if not submitted_query:
            return {"is_correct": False, "score_ratio": 0, "feedback": "No answer provided"}
        # Normalize and compare keywords
        sub = submitted_query.lower().strip()
        cor = correct_query.lower().strip() if correct_query else ""
        keywords = ["select", "from", "where", "join", "group by", "having", "order by"]
        matched = sum(1 for kw in keywords if kw in sub and kw in cor)
        total_kw = sum(1 for kw in keywords if kw in cor) or 1
        ratio = matched / total_kw
        return {
            "is_correct": ratio >= 0.8,
            "score_ratio": min(ratio, 1.0),
            "feedback": f"Query matched {int(ratio*100)}% of expected structure"
        }

    def _evaluate_code(self, code: str, language: str, question) -> dict:
        """Run code against visible test cases."""
        if not code:
            return {"is_correct": False, "score_ratio": 0, "test_results": []}

        test_cases = []
        if question.options:  # We store visible test cases in options for coding
            test_cases = question.options if isinstance(question.options, list) else []

        if not test_cases:
            return {"is_correct": True, "score_ratio": 0.5, "test_results": [], "feedback": "No test cases"}

        passed = 0
        results = []
        for tc in test_cases[:3]:  # Only run visible test cases
            result = self._run_code(code, language, tc.get("input", ""), tc.get("expected_output", ""))
            results.append(result)
            if result.get("passed"):
                passed += 1

        ratio = passed / len(test_cases) if test_cases else 0
        return {"is_correct": ratio >= 0.5, "score_ratio": ratio, "test_results": results}

    def _run_code(self, code: str, language: str, stdin: str, expected: str) -> dict:
        """Execute code safely in a subprocess."""
        try:
            if language == "python":
                with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
                    f.write(code)
                    fname = f.name
                result = subprocess.run(
                    ["python", fname],
                    input=stdin, capture_output=True, text=True, timeout=5
                )
                os.unlink(fname)
                output = result.stdout.strip()
                return {
                    "passed": output == expected.strip(),
                    "output": output,
                    "expected": expected,
                    "error": result.stderr[:200] if result.stderr else None
                }
            else:
                return {"passed": False, "output": "", "expected": expected,
                        "error": f"Language {language} execution not yet configured"}
        except subprocess.TimeoutExpired:
            return {"passed": False, "output": "", "expected": expected, "error": "Time limit exceeded"}
        except Exception as e:
            return {"passed": False, "output": "", "expected": expected, "error": str(e)}
