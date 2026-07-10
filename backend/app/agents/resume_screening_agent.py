import json
import re
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
    def _fallback_screen(self, resume_text: str, candidate_skills: list, job: dict, error: Exception) -> dict:
        required_skills = job.get("required_skills", []) or []
        resume_blob = " ".join([resume_text or "", " ".join(candidate_skills or [])]).lower()

        matched_skills = []
        missing_skills = []
        for skill in required_skills:
            skill_text = str(skill).strip()
            if not skill_text:
                continue

            pattern = r"\b" + re.escape(skill_text.lower()) + r"\b"
            if re.search(pattern, resume_blob):
                matched_skills.append(skill_text)
            else:
                missing_skills.append(skill_text)

        if required_skills:
            skill_score = (len(matched_skills) / len(required_skills)) * 85
        else:
            skill_score = 60 if candidate_skills else 35

        content_bonus = 0
        if candidate_skills:
            content_bonus += 5
        if re.search(r"\b(project|developed|built|implemented|experience)\b", resume_blob):
            content_bonus += 5
        if re.search(r"\b(degree|bachelor|master|certification|certified)\b", resume_blob):
            content_bonus += 5

        match_percentage = min(100, round(skill_score + content_bonus, 2))
        strengths = []
        if matched_skills:
            strengths.append("Matched required skills: " + ", ".join(matched_skills))
        if candidate_skills:
            strengths.append("Extracted candidate skills from resume")

        weaknesses = []
        if missing_skills:
            weaknesses.append("Missing required skills: " + ", ".join(missing_skills))
        if not candidate_skills:
            weaknesses.append("Could not identify skills clearly from the resume text")

        return {
            "match_percentage": match_percentage,
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "recommendations": "Review the missing skills and update the resume with relevant project or work experience.",
            "summary": f"AI screening fallback used because automated screening failed: {str(error)}"
        }

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
            return self._fallback_screen(resume_text, candidate_skills, job, e)
