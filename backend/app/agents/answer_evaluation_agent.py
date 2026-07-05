import json
from app.agents.gemini_client import generate_json


EVALUATION_PROMPT = """
You are an expert technical interview evaluator at a leading IT company.

Evaluate the candidate's answer to the following interview question:

QUESTION: {question}
QUESTION TYPE: {question_type}
EXPECTED KEYWORDS: {expected_keywords}
CANDIDATE'S ANSWER: {answer}

Evaluate on these dimensions (score 0-10 each):
1. technical_knowledge - Accuracy and depth of technical content
2. communication - Clarity and structure of explanation
3. confidence - Assertiveness and certainty in response
4. grammar - Language quality and coherence
5. keyword_coverage - Coverage of expected technical keywords
6. completeness - How fully the question was answered
7. problem_solving - Logical and analytical thinking shown

Return JSON:
{{
  "technical_knowledge": <0-10>,
  "communication": <0-10>,
  "confidence": <0-10>,
  "grammar": <0-10>,
  "keyword_coverage": <0-10>,
  "completeness": <0-10>,
  "problem_solving": <0-10>,
  "overall_score": <0-100>,
  "strengths": ["<strength1>", "<strength2>"],
  "weaknesses": ["<weakness1>", "<weakness2>"],
  "suggestions": ["<suggestion1>", "<suggestion2>"],
  "brief_feedback": "<2-3 sentence feedback>"
}}
"""


FINAL_EVALUATION_PROMPT = """
You are a senior HR and technical evaluator. Provide a comprehensive evaluation of this candidate's interview performance.

CANDIDATE ANSWERS SUMMARY:
{answers_summary}

INDIVIDUAL SCORES: {individual_scores}

Based on all answers, provide a final evaluation:
{{
  "overall_score": <0-100>,
  "technical_score": <0-100>,
  "communication_score": <0-100>,
  "confidence_score": <0-100>,
  "grammar_score": <0-100>,
  "problem_solving_score": <0-100>,
  "keyword_coverage_score": <0-100>,
  "strengths": ["<top strengths>"],
  "weaknesses": ["<main weaknesses>"],
  "suggestions": ["<improvement suggestions>"],
  "ai_feedback": "<comprehensive 3-4 sentence final assessment>",
  "hire_recommendation": "<strong_yes|yes|maybe|no>",
  "recommendation_reason": "<reason for recommendation>"
}}
"""


class AnswerEvaluationAgent:
    def evaluate_answer(self, question: str, answer: str, question_type: str,
                        expected_keywords: list = None) -> dict:
        if not answer or len(answer.strip()) < 5:
            return self._empty_answer_score()

        prompt = EVALUATION_PROMPT.format(
            question=question,
            question_type=question_type,
            expected_keywords=", ".join(expected_keywords or []),
            answer=answer[:2000]
        )
        try:
            raw = generate_json(prompt)
            return json.loads(raw)
        except Exception:
            return self._default_score()

    def evaluate_full_interview(self, answers: list) -> dict:
        if not answers:
            return self._empty_final_score()

        answers_summary = "\n".join([
            f"Q{i+1}: {a.get('question_text', '')}\nA: {a.get('answer_text', '')[:300]}"
            for i, a in enumerate(answers)
        ])
        individual_scores = [
            {"q": a.get("question_text", "")[:50], "score": a.get("score", 0)}
            for a in answers
        ]

        prompt = FINAL_EVALUATION_PROMPT.format(
            answers_summary=answers_summary[:4000],
            individual_scores=json.dumps(individual_scores)
        )
        try:
            raw = generate_json(prompt)
            return json.loads(raw)
        except Exception:
            return self._empty_final_score()

    def _empty_answer_score(self) -> dict:
        return {
            "technical_knowledge": 0, "communication": 0, "confidence": 0,
            "grammar": 0, "keyword_coverage": 0, "completeness": 0,
            "problem_solving": 0, "overall_score": 0,
            "strengths": [], "weaknesses": ["No answer provided"],
            "suggestions": ["Please provide a detailed answer"], "brief_feedback": "No answer given."
        }

    def _default_score(self) -> dict:
        return {
            "technical_knowledge": 5, "communication": 5, "confidence": 5,
            "grammar": 5, "keyword_coverage": 5, "completeness": 5,
            "problem_solving": 5, "overall_score": 50,
            "strengths": [], "weaknesses": [],
            "suggestions": [], "brief_feedback": "Evaluation pending."
        }

    def _empty_final_score(self) -> dict:
        return {
            "overall_score": 0, "technical_score": 0, "communication_score": 0,
            "confidence_score": 0, "grammar_score": 0, "problem_solving_score": 0,
            "keyword_coverage_score": 0, "strengths": [], "weaknesses": [],
            "suggestions": [], "ai_feedback": "Evaluation unavailable.",
            "hire_recommendation": "no", "recommendation_reason": "Incomplete interview."
        }
