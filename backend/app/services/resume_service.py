import os
import re
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
You are a resume parser. Extract ALL skills mentioned in this resume — technical skills,
programming languages, frameworks, tools, databases, cloud platforms, soft skills, etc.
Be thorough and do not miss any skill.

RESUME TEXT:
{resume_text}

Return ONLY a valid JSON object with these exact keys:
{{
  "name": "<full name or empty string>",
  "email": "<email or empty string>",
  "phone": "<phone number or empty string>",
  "skills": ["skill1", "skill2", "skill3"],
  "experience": [
    {{"company": "<company>", "role": "<role>", "duration": "<duration>", "description": "<brief>"}}
  ],
  "education": [
    {{"degree": "<degree>", "institution": "<institution>", "year": "<year>"}}
  ],
  "projects": [
    {{"name": "<project>", "description": "<description>", "technologies": ["tech1", "tech2"]}}
  ],
  "certifications": ["cert1", "cert2"]
}}

Make sure "skills" is a non-empty array containing every technology, language, tool and skill found in the resume.
"""


def _normalize_skills(value) -> list[str]:
    if isinstance(value, str):
        value = re.split(r"[,;\n|/]+", value)
    if not isinstance(value, list):
        return []

    seen = set()
    skills = []
    for item in value:
        if not isinstance(item, str):
            continue
        skill = re.sub(r"\s+", " ", item).strip(" -:*.\t\r\n")
        if not skill:
            continue
        key = skill.casefold()
        if key not in seen:
            seen.add(key)
            skills.append(skill)
    return skills


def _extract_section_skills(text: str) -> list[str]:
    section_match = re.search(
        r"(?is)(?:technical\s+skills|skills|technologies|tools)\s*[:\n-]+(.{0,1200}?)(?=\n\s*(?:experience|work\s+experience|education|projects|certifications|summary|objective)\b|$)",
        text,
    )
    if not section_match:
        return []

    section_text = section_match.group(1)
    candidates = re.split(r"[,;\n|]+", section_text)
    skills = []
    for candidate in candidates:
        cleaned = re.sub(r"^[\s\-*]+", "", candidate).strip()
        cleaned = re.sub(r"\s+", " ", cleaned).strip(" -:*.")
        if 1 <= len(cleaned) <= 40 and not re.search(r"\b(responsible|experience|worked|developed)\b", cleaned, re.I):
            skills.append(cleaned)
    return _normalize_skills(skills)


def _extract_skills_from_text(text: str) -> list[str]:
    """
    Regex-based fallback skill extractor used when the AI call fails.
    Scans sections and common tech keywords so we avoid returning an empty list.
    """
    known_skills = [
        # Languages
        "Python", "Java", "JavaScript", "TypeScript", "C", "C++", "C#", "Go",
        "Ruby", "PHP", "Swift", "Kotlin", "Rust", "Scala", "R", "MATLAB",
        "Perl", "Shell", "Bash", "PowerShell",
        # Web
        "HTML", "CSS", "React", "Angular", "Vue", "Next.js", "Nuxt", "Svelte",
        "Node.js", "Express", "FastAPI", "Django", "Flask", "Spring Boot",
        "Spring", "Laravel", "Rails", "ASP.NET", "Tailwind", "Tailwind CSS",
        "Bootstrap", "Redux", "Zustand", "Material UI", "Vite", "Webpack",
        # Data / AI
        "TensorFlow", "PyTorch", "Keras", "scikit-learn", "Pandas", "NumPy",
        "Matplotlib", "Seaborn", "OpenCV", "NLP", "Machine Learning",
        "Deep Learning", "Data Science", "LangChain", "Hugging Face",
        # Databases
        "MySQL", "PostgreSQL", "MongoDB", "SQLite", "Redis", "Cassandra",
        "Oracle", "SQL Server", "DynamoDB", "Elasticsearch", "SQL", "NoSQL",
        # Cloud / DevOps
        "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Ansible",
        "CI/CD", "Jenkins", "GitHub Actions", "Linux", "Nginx", "Firebase",
        "Supabase", "Vercel", "Render", "Netlify", "Heroku",
        # Tools
        "Git", "GitHub", "GitLab", "Bitbucket", "Jira", "Postman",
        "VS Code", "IntelliJ", "Eclipse", "Tableau", "Power BI", "Excel",
        "Figma", "Canva",
        # Misc
        "REST", "REST API", "REST APIs", "GraphQL", "gRPC", "API", "JSON",
        "XML", "Microservices", "Agile", "Scrum", "OOP", "Data Structures",
        "Algorithms", "Communication", "Leadership", "Problem Solving", "Teamwork",
    ]
    found = _extract_section_skills(text)
    seen = {skill.casefold() for skill in found}
    text_lower = text.lower()
    for skill in known_skills:
        pattern = r'\b' + re.escape(skill.lower()) + r'\b'
        if re.search(pattern, text_lower) and skill.casefold() not in seen:
            found.append(skill)
            seen.add(skill.casefold())
    return _normalize_skills(found)


def extract_skills_from_resume_text(text: str) -> list[str]:
    return _extract_skills_from_text(text or "")


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
        extracted = {}
        try:
            prompt = EXTRACT_PROMPT.format(resume_text=raw_text[:5000])
            raw_json = generate_json(prompt)
            extracted = json.loads(raw_json)
            extracted["skills"] = _normalize_skills(extracted.get("skills", []))
        except Exception as e:
            print(f"[ResumeService] AI extraction error: {e}")
            extracted = {}

        # If AI returned no skills, fall back to regex extraction
        ai_skills = extracted.get("skills", [])
        if not ai_skills:
            print("[ResumeService] AI returned no skills — using regex fallback")
            ai_skills = _extract_skills_from_text(raw_text)
            extracted["skills"] = ai_skills

        # Persist extracted fields (always update so re-uploads work correctly)
        self.resume_repo.update_extracted(resume.id, {
            "extracted_name": extracted.get("name") or None,
            "extracted_email": extracted.get("email") or None,
            "extracted_phone": extracted.get("phone") or None,
            "extracted_skills": ai_skills,
            "extracted_experience": extracted.get("experience", []),
            "extracted_education": extracted.get("education", []),
            "extracted_projects": extracted.get("projects", []),
            "extracted_certifications": extracted.get("certifications", []),
            "raw_text": raw_text,
        })
        print(f"[ResumeService] Extracted {len(ai_skills)} skills: {ai_skills[:10]}")

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
