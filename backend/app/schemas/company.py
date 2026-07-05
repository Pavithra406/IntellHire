from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CompanyCreate(BaseModel):
    company_name: str
    industry: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None


class CompanyUpdate(BaseModel):
    company_name: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None


class CompanyOut(BaseModel):
    id: int
    company_name: str
    industry: Optional[str]
    website: Optional[str]
    description: Optional[str]
    location: Optional[str]
    logo_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
