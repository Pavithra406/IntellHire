import json
from app.agents.gemini_client import generate_json
from app.core.config import settings


RESUME_SCREENING_PROMPT = """
You are an expert AI recruiter. Analyze the candidate's resume against the job description.

JOB TITLE: {job_title}
JOB DESCRIPTION: {job_description}
REQUIRED SKILLS: {required_skills}
EXPERIENCE REQUIRED: {experience_years}
QUALIFICATION: {qualification}

CANDIDATE RESUME TEXT:
{resume_text}

EXTRACTED CANDIDATE SKILLS: {candidate_skills}

Perform a thorough analysis and return a JSON object with these exact keys:
{{
  "match_percentage": <number 0-100>,
  "matched_skills": [<list of matched skills>],
  "missing_skills": [<list of missing skills>],
  "strengths": [<list of candidate strengths>],
  "weaknesses": [<list of candidate weaknesses>],
  "recommendations": "<string with improvement suggestions>",
  "summary": "<brief 2-3 sentence overall assessment>"
}}
"""


class ResumeScreeningAgent:
    def screen(self, resume_text: str, candidate_skills: list, job: dict) -> dict:
        prompt = RESUME_SCREENING_PROMPT.format(
            job_title=job.get("title", ""),
            job_description=job.get("description", ""),
            required_skills=", ".join(job.get("required_skills", [])),
            experience_years=job.get("experience_years", "Not specified"),
            qualification=job.get("qualification", "Not specified"),
            resume_text=resume_text[:4000],  # limit tokens
            candidate_skills=", ".join(candidate_skills)
        )
        try:
            raw = generate_json(prompt)
            result = json.loads(raw)
            return result
        except Exception as e:
            return {
                "match_percentage": 0,
                "matched_skills": [],
                "missing_skills": job.get("required_skills", []),
                "strengths": [],
                "weaknesses": ["Could not parse resume"],
                "recommendations": "Please re-upload resume",
                "summary": f"Screening failed: {str(e)}"
            }
