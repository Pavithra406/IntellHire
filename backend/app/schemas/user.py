from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "candidate"


class UserCreate(UserBase):
    password: str


class HRRegister(BaseModel):
    email: EmailStr
    full_name: str
    password: str


class CandidateCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    job_id: int


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class TokenData(BaseModel):
    user_id: Optional[int] = None
    role: Optional[str] = None
