import json
from app.agents.gemini_client import generate_json


QUESTION_GEN_PROMPT = """
You are an expert technical interviewer at a top IT company.

Generate interview questions for the following role:

JOB TITLE: {job_title}
JOB DESCRIPTION: {job_description}
REQUIRED SKILLS: {required_skills}
CANDIDATE SKILLS: {candidate_skills}
CANDIDATE EXPERIENCE: {candidate_experience}

Generate exactly {num_questions} interview questions across these categories:
- technical (40%)
- coding (20%)
- behavioral (20%)
- scenario (10%)
- hr (10%)

Return a JSON array with this exact structure:
[
  {{
    "question_text": "<question>",
    "question_type": "<technical|coding|behavioral|scenario|hr>",
    "difficulty": "<easy|medium|hard>",
    "expected_keywords": ["<keyword1>", "<keyword2>"]
  }}
]
"""


FOLLOWUP_PROMPT = """
You are conducting a technical interview. Based on the candidate's previous answer, generate a relevant follow-up question.

ORIGINAL QUESTION: {original_question}
CANDIDATE'S ANSWER: {candidate_answer}
INTERVIEW CONTEXT (previous Q&A): {context}

Generate 1 follow-up question that:
- Probes deeper into the topic
- Tests knowledge gaps identified in their answer
- Is conversational and natural

Return JSON: {{"follow_up_question": "<question text>"}}
"""


class QuestionGeneratorAgent:
    def generate_questions(self, job: dict, candidate_info: dict, num_questions: int = 10) -> list:
        prompt = QUESTION_GEN_PROMPT.format(
            job_title=job.get("title", ""),
            job_description=job.get("description", "")[:2000],
            required_skills=", ".join(job.get("required_skills", [])),
            candidate_skills=", ".join(candidate_info.get("skills", [])),
            candidate_experience=candidate_info.get("experience", "Not specified"),
            num_questions=num_questions
        )
        try:
            raw = generate_json(prompt)
            questions = json.loads(raw)
            return questions if isinstance(questions, list) else []
        except Exception as e:
            # Return default questions on failure
            return self._default_questions(job.get("required_skills", []))

    def generate_followup(self, original_question: str, candidate_answer: str, context: list) -> str:
        prompt = FOLLOWUP_PROMPT.format(
            original_question=original_question,
            candidate_answer=candidate_answer[:1000],
            context=json.dumps(context[-3:])  # last 3 exchanges
        )
        try:
            raw = generate_json(prompt)
            result = json.loads(raw)
            return result.get("follow_up_question", "Can you elaborate further?")
        except Exception:
            return "Can you provide more details about your approach?"

    def _default_questions(self, skills: list) -> list:
        return [
            {"question_text": "Tell me about yourself and your background.", "question_type": "hr", "difficulty": "easy", "expected_keywords": []},
            {"question_text": f"Explain your experience with {skills[0] if skills else 'your primary technology'}.", "question_type": "technical", "difficulty": "medium", "expected_keywords": skills[:3]},
            {"question_text": "Describe a challenging project you worked on.", "question_type": "behavioral", "difficulty": "medium", "expected_keywords": []},
            {"question_text": "How do you handle tight deadlines?", "question_type": "scenario", "difficulty": "easy", "expected_keywords": []},
            {"question_text": "Write a function to reverse a string.", "question_type": "coding", "difficulty": "easy", "expected_keywords": []},
        ]
