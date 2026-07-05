import os
import json
import PyPDF2
import docx
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from app.core.config import settings
from app.repositories.resume_repository import ResumeRepository
from app.repositories.candidate_repository import CandidateRepository
from app.repositories.job_repository import JobRepository
from app.agents.resume_screening_agent import ResumeScreeningAgent
from app.agents.gemini_client import generate_json


EXTRACT_PROMPT = """
Extract structured information from this resume text.

RESUME TEXT:
{resume_text}

Return JSON:
{{
  "name": "<full name>",
  "email": "<email>",
  "phone": "<phone number>",
  "skills": ["<skill1>", "<skill2>"],
  "experience": [
    {{"company": "<company>", "role": "<role>", "duration": "<duration>", "description": "<brief>"}}
  ],
  "education": [
    {{"degree": "<degree>", "institution": "<institution>", "year": "<year>"}}
  ],
  "projects": [
    {{"name": "<project>", "description": "<description>", "technologies": ["<tech>"]}}
  ],
  "certifications": ["<cert1>", "<cert2>"]
}}
"""


def extract_text_from_file(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()
    text = ""

    if ext == ".pdf":
        # Try pdfplumber first (best results)
        try:
            import pdfplumber
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
            if text.strip():
                return text.strip()
        except Exception:
            pass

        # Fallback to PyPDF2
        try:
            with open(file_path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
            if text.strip():
                return text.strip()
        except Exception:
            pass

    elif ext in [".docx", ".doc"]:
        try:
            doc = docx.Document(file_path)
            text = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
        except Exception:
            pass

    return text.strip()


class ResumeService:
    def __init__(self, db: Session):
        self.db = db
        self.resume_repo = ResumeRepository(db)
        self.candidate_repo = CandidateRepository(db)
        self.job_repo = JobRepository(db)
        self.screening_agent = ResumeScreeningAgent()

    async def upload_and_process(self, candidate_id: int, file: UploadFile) -> dict:
        # Validate file
        allowed = {".pdf", ".docx", ".doc"}
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in allowed:
            raise HTTPException(status_code=400, detail="Only PDF and DOCX files are allowed")

        # Save file
        upload_dir = os.path.join(settings.UPLOAD_DIR, "resumes", str(candidate_id))
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, file.filename)

        content = await file.read()
        if len(content) > settings.MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large (max 10MB)")

        with open(file_path, "wb") as f:
            f.write(content)

        # Extract text
        raw_text = extract_text_from_file(file_path)
        if not raw_text:
            raise HTTPException(status_code=400, detail="Could not extract text from file")

        # Save resume record
        candidate = self.candidate_repo.get_by_id(candidate_id)
        existing = self.resume_repo.get_by_candidate(candidate_id)
        if existing:
            resume = self.resume_repo.update_extracted(existing.id, {
                "file_path": file_path, "file_name": file.filename, "raw_text": raw_text
            })
        else:
            resume = self.resume_repo.create(candidate_id, file_path, file.filename)

        # Extract structured info with AI
        try:
            prompt = EXTRACT_PROMPT.format(resume_text=raw_text[:4000])
            raw_json = generate_json(prompt)
            extracted = json.loads(raw_json)
            self.resume_repo.update_extracted(resume.id, {
                "extracted_name": extracted.get("name"),
                "extracted_email": extracted.get("email"),
                "extracted_phone": extracted.get("phone"),
                "extracted_skills": extracted.get("skills", []),
                "extracted_experience": extracted.get("experience", []),
                "extracted_education": extracted.get("education", []),
                "extracted_projects": extracted.get("projects", []),
                "extracted_certifications": extracted.get("certifications", []),
                "raw_text": raw_text
            })
        except Exception as e:
            print(f"Extraction error: {e}")
            extracted = {"skills": []}

        # Run screening
        job = self.job_repo.get_by_id(candidate.job_id)
        job_dict = {
            "title": job.title,
            "description": job.description,
            "required_skills": job.required_skills or [],
            "experience_years": job.experience_years,
            "qualification": job.qualification
        }
        screening_result = self.screening_agent.screen(
            raw_text, extracted.get("skills", []), job_dict
        )

        match_pct = screening_result.get("match_percentage", 0)
        status = "passed" if match_pct >= job.resume_cutoff else "failed"

        self.resume_repo.update_screening(
            resume.id,
            match_pct,
            screening_result.get("missing_skills", []),
            screening_result.get("strengths", []),
            screening_result.get("weaknesses", []),
            screening_result.get("recommendations", ""),
            status
        )

        # Update candidate status
        if status == "failed":
            self.candidate_repo.update_status(candidate_id, "resume_rejected")
        else:
            self.candidate_repo.update_status(candidate_id, "aptitude_pending")

        return {
            "resume_id": resume.id,
            "match_percentage": match_pct,
            "status": status,
            "screening": screening_result
        }
