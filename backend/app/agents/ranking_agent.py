import json
from app.agents.gemini_client import generate_json


RANKING_PROMPT = """
You are an AI recruitment ranking agent. Calculate the final candidate score and provide a recommendation.

CANDIDATE SCORES:
- Resume Match: {resume_score}%
- Aptitude Assessment: {aptitude_score}%
- SQL Assessment: {sql_score}%
- Coding Assessment: {coding_score}%
- AI Interview Score: {interview_score}%
- Proctoring Violations: {violation_count} violations

WEIGHTS:
- Resume: 15%
- Aptitude: 15%
- SQL: 15%
- Coding: 20%
- Interview: 35%

VIOLATION PENALTY: Deduct 2 points per violation (max 20 points deduction)

Calculate the weighted overall score and provide a recommendation.

Return JSON:
{{
  "resume_score": {resume_score},
  "aptitude_score": {aptitude_score},
  "sql_score": {sql_score},
  "coding_score": {coding_score},
  "interview_score": {interview_score},
  "violation_penalty": <deduction>,
  "overall_score": <weighted score after penalty>,
  "score_breakdown": {{
    "resume_weighted": <score>,
    "aptitude_weighted": <score>,
    "sql_weighted": <score>,
    "coding_weighted": <score>,
    "interview_weighted": <score>
  }},
  "recommendation": "<strong_hire|hire|maybe|reject>",
  "recommendation_reason": "<brief reason>",
  "strengths": ["<strength1>", "<strength2>"],
  "concerns": ["<concern1>", "<concern2>"]
}}
"""


class RankingAgent:
    def calculate_ranking(self, scores: dict, violation_count: int = 0) -> dict:
        prompt = RANKING_PROMPT.format(
            resume_score=scores.get("resume_score", 0),
            aptitude_score=scores.get("aptitude_score", 0),
            sql_score=scores.get("sql_score", 0),
            coding_score=scores.get("coding_score", 0),
            interview_score=scores.get("interview_score", 0),
            violation_count=violation_count
        )
        try:
            raw = generate_json(prompt)
            result = json.loads(raw)
            return result
        except Exception:
            # Fallback: calculate locally
            return self._calculate_locally(scores, violation_count)

    def _calculate_locally(self, scores: dict, violations: int) -> dict:
        weights = {"resume": 0.15, "aptitude": 0.15, "sql": 0.15, "coding": 0.20, "interview": 0.35}
        r = scores.get("resume_score", 0)
        ap = scores.get("aptitude_score", 0)
        sq = scores.get("sql_score", 0)
        co = scores.get("coding_score", 0)
        iv = scores.get("interview_score", 0)

        weighted = (r * weights["resume"] + ap * weights["aptitude"] +
                    sq * weights["sql"] + co * weights["coding"] +
                    iv * weights["interview"])
        penalty = min(violations * 2, 20)
        overall = max(0, weighted - penalty)

        rec = "strong_hire" if overall >= 80 else "hire" if overall >= 65 else "maybe" if overall >= 50 else "reject"
        return {
            "resume_score": r, "aptitude_score": ap, "sql_score": sq,
            "coding_score": co, "interview_score": iv,
            "violation_penalty": penalty, "overall_score": round(overall, 2),
            "score_breakdown": {
                "resume_weighted": round(r * weights["resume"], 2),
                "aptitude_weighted": round(ap * weights["aptitude"], 2),
                "sql_weighted": round(sq * weights["sql"], 2),
                "coding_weighted": round(co * weights["coding"], 2),
                "interview_weighted": round(iv * weights["interview"], 2),
            },
            "recommendation": rec,
            "recommendation_reason": f"Based on overall weighted score of {round(overall, 2)}%",
            "strengths": [], "concerns": []
        }
