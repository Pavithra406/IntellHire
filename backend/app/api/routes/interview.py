from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import os, aiofiles
from app.core.database import get_db
from app.core.security import get_current_user, require_hr
from app.core.config import settings
from app.services.interview_service import InterviewService
from app.repositories.candidate_repository import CandidateRepository
from app.repositories.interview_repository import InterviewRepository
from app.schemas.interview import GenerateQuestionsRequest, InterviewQuestionUpdate

router = APIRouter(prefix="/interview", tags=["Interview"])


@router.post("/questions/generate")
def generate_questions(data: GenerateQuestionsRequest, db: Session = Depends(get_db),
                       hr=Depends(require_hr)):
    service = InterviewService(db)
    questions = service.generate_questions_for_job(
        data.job_id, data.candidate_id, data.num_questions
    )
    return {"questions": questions, "count": len(questions)}


@router.get("/questions/{job_id}")
def get_questions(job_id: int, db: Session = Depends(get_db),
                  current_user=Depends(get_current_user)):
    repo = InterviewRepository(db)
    questions = repo.get_questions_for_job(job_id)
    return [{"id": q.id, "question_text": q.question_text,
             "question_type": q.question_type, "difficulty": q.difficulty}
            for q in questions]


@router.put("/questions/{question_id}")
def update_question(question_id: int, data: InterviewQuestionUpdate,
                    db: Session = Depends(get_db), hr=Depends(require_hr)):
    repo = InterviewRepository(db)
    q = repo.update_question(question_id, data.model_dump(exclude_none=True))
    return {"id": q.id, "question_text": q.question_text}


@router.delete("/questions/{question_id}")
def delete_question(question_id: int, db: Session = Depends(get_db), hr=Depends(require_hr)):
    InterviewRepository(db).delete_question(question_id)
    return {"message": "Question deleted"}


@router.post("/start")
def start_interview(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role != "candidate":
        raise HTTPException(403, "Candidates only")
    candidate = CandidateRepository(db).get_by_user_id(current_user.id)
    if not candidate:
        raise HTTPException(404, "Candidate not found")
    service = InterviewService(db)
    return service.start_interview(candidate.id)


@router.post("/{interview_id}/answer")
def submit_answer(interview_id: int, payload: dict,
                  db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role != "candidate":
        raise HTTPException(403, "Candidates only")
    candidate = CandidateRepository(db).get_by_user_id(current_user.id)
    if not candidate:
        raise HTTPException(404, "Candidate not found")

    service = InterviewService(db)
    return service.submit_answer(
        interview_id, candidate.id,
        payload.get("question_text", ""),
        payload.get("answer_text", ""),
        payload.get("sequence_order", 1)
    )


@router.post("/{interview_id}/complete")
def complete_interview(interview_id: int, db: Session = Depends(get_db),
                       current_user=Depends(get_current_user)):
    if current_user.role != "candidate":
        raise HTTPException(403, "Candidates only")
    candidate = CandidateRepository(db).get_by_user_id(current_user.id)
    if not candidate:
        raise HTTPException(404, "Candidate not found")
    service = InterviewService(db)
    return service.complete_interview(interview_id, candidate.id)


@router.post("/{interview_id}/upload-recording")
async def upload_recording(interview_id: int, file: UploadFile = File(...),
                           recording_type: str = "voice",
                           db: Session = Depends(get_db),
                           current_user=Depends(get_current_user)):
    candidate = CandidateRepository(db).get_by_user_id(current_user.id)
    if not candidate:
        raise HTTPException(404, "Candidate not found")

    upload_dir = os.path.join(settings.UPLOAD_DIR, "recordings", str(candidate.id))
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, f"{recording_type}_{file.filename}")

    async with aiofiles.open(file_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    repo = InterviewRepository(db)
    if recording_type == "voice":
        repo.save_recordings(interview_id, voice_path=file_path)
    else:
        repo.save_recordings(interview_id, camera_path=file_path)

    return {"message": "Recording saved", "path": file_path}


@router.get("/my")
def my_interview(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role != "candidate":
        raise HTTPException(403, "Candidates only")
    candidate = CandidateRepository(db).get_by_user_id(current_user.id)
    if not candidate:
        raise HTTPException(404, "Not found")
    interview = InterviewRepository(db).get_by_candidate(candidate.id)
    if not interview:
        return None
    return {
        "id": interview.id,
        "status": interview.status,
        "overall_score": interview.overall_score,
        "technical_score": interview.technical_score,
        "communication_score": interview.communication_score,
        "ai_feedback": interview.ai_feedback,
        "strengths": interview.strengths,
        "weaknesses": interview.weaknesses,
        "suggestions": interview.suggestions,
        "transcript": interview.transcript,
        "started_at": interview.started_at,
        "completed_at": interview.completed_at
    }


@router.get("/detail/{candidate_id}")
def get_interview_detail(candidate_id: int, db: Session = Depends(get_db),
                         hr=Depends(require_hr)):
    interview = InterviewRepository(db).get_by_candidate(candidate_id)
    if not interview:
        raise HTTPException(404, "Interview not found")
    return {
        "id": interview.id,
        "status": interview.status,
        "overall_score": interview.overall_score,
        "technical_score": interview.technical_score,
        "communication_score": interview.communication_score,
        "confidence_score": interview.confidence_score,
        "grammar_score": interview.grammar_score,
        "problem_solving_score": interview.problem_solving_score,
        "keyword_coverage_score": interview.keyword_coverage_score,
        "ai_feedback": interview.ai_feedback,
        "strengths": interview.strengths,
        "weaknesses": interview.weaknesses,
        "suggestions": interview.suggestions,
        "transcript": interview.transcript,
        "voice_recording_path": interview.voice_recording_path,
        "camera_recording_path": interview.camera_recording_path,
        "answers": [
            {"sequence": a.sequence_order, "question": a.question_text,
             "answer": a.answer_text, "score": a.score, "evaluation": a.evaluation}
            for a in sorted(interview.answers, key=lambda x: x.sequence_order or 0)
        ]
    }
