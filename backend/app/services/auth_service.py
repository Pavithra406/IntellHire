from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.repositories.user_repository import UserRepository
from app.core.security import verify_password, create_access_token


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)

    def register_hr(self, email: str, full_name: str, password: str):
        if self.user_repo.get_by_email(email):
            raise HTTPException(status_code=400, detail="Email already registered")
        if len(password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
        return self.user_repo.create(email, full_name, password, role="hr")

    def login(self, email: str, password: str) -> dict:
        user = self.user_repo.get_by_email(email)
        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        if not user.is_active:
            raise HTTPException(status_code=400, detail="Account is disabled")
        token = create_access_token({"sub": str(user.id), "role": user.role})
        return {"access_token": token, "token_type": "bearer", "user": user}

    def create_candidate_account(self, email: str, full_name: str, password: str,
                                  job_id: int, created_by_id: int):
        from app.repositories.candidate_repository import CandidateRepository
        if self.user_repo.get_by_email(email):
            raise HTTPException(status_code=400, detail="Email already registered")
        user = self.user_repo.create(email, full_name, password, role="candidate")
        candidate = CandidateRepository(self.db).create(user.id, job_id, created_by_id)
        return {"user": user, "candidate": candidate}
