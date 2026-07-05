# PDF question upload route - reserved for future use
# Questions are now added manually via /question-bank endpoints
from fastapi import APIRouter
router = APIRouter(prefix="/questions", tags=["Question Upload"])
