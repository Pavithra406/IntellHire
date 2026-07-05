from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, get_current_user
from app.repositories.user_repository import UserRepository
from app.schemas.user import HRRegister, UserLogin, Token, UserOut, CandidateCreate

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=Token, summary="HR Registration")
def register(data: HRRegister, db: Session = Depends(get_db)):
    repo = UserRepository(db)
    if repo.get_by_email(data.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = repo.create(data.email, data.full_name, data.password, role="hr")
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.post("/login", response_model=Token, summary="Login for HR and Candidate")
def login(data: UserLogin, db: Session = Depends(get_db)):
    repo = UserRepository(db)
    user = repo.get_by_email(data.email)
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=UserOut, summary="Get current user")
def me(current_user=Depends(get_current_user)):
    return current_user
