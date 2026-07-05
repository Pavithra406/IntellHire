from sqlalchemy.orm import Session
from app.models.proctoring import ProctoringViolation
from app.repositories.candidate_repository import CandidateRepository


class ProctoringService:
    def __init__(self, db: Session):
        self.db = db
        self.candidate_repo = CandidateRepository(db)

    def log_violation(self, candidate_id: int, session_type: str,
                      violation_type: str, description: str = None) -> dict:
        violation = ProctoringViolation(
            candidate_id=candidate_id,
            session_type=session_type,
            violation_type=violation_type,
            description=description
        )
        self.db.add(violation)
        self.db.commit()
        self.db.refresh(violation)
        return {
            "id": violation.id,
            "violation_type": violation.violation_type,
            "session_type": violation.session_type,
            "occurred_at": violation.occurred_at.isoformat()
        }

    def get_violations(self, candidate_id: int) -> list:
        violations = self.db.query(ProctoringViolation).filter(
            ProctoringViolation.candidate_id == candidate_id
        ).order_by(ProctoringViolation.occurred_at.desc()).all()
        return [
            {
                "id": v.id,
                "session_type": v.session_type,
                "violation_type": v.violation_type,
                "description": v.description,
                "occurred_at": v.occurred_at.isoformat()
            }
            for v in violations
        ]

    def get_violation_report(self, candidate_id: int) -> dict:
        violations = self.get_violations(candidate_id)
        summary = {}
        for v in violations:
            vtype = v["violation_type"]
            summary[vtype] = summary.get(vtype, 0) + 1
        return {
            "total_violations": len(violations),
            "summary": summary,
            "violations": violations
        }
