import json
from app.agents.gemini_client import generate_json


APTITUDE_PROMPT = """
Generate {count} aptitude MCQ questions for a software engineering candidate.
Include a mix of: logical reasoning, quantitative aptitude, and verbal reasoning.

Return a JSON array:
[
  {{
    "question_text": "<question>",
    "question_type": "mcq",
    "options": [
      {{"label": "A", "text": "<option A>"}},
      {{"label": "B", "text": "<option B>"}},
      {{"label": "C", "text": "<option C>"}},
      {{"label": "D", "text": "<option D>"}}
    ],
    "correct_answer": "<A|B|C|D>",
    "category": "<logical|quantitative|verbal>",
    "marks": 1
  }}
]
"""

SQL_MCQ_PROMPT = """
Generate {count} SQL multiple-choice questions for a software engineering candidate.
Cover: SELECT, JOIN, GROUP BY, subqueries, indexes, transactions, normalization.

Return JSON array:
[
  {{
    "question_text": "<question>",
    "question_type": "mcq",
    "options": [
      {{"label": "A", "text": "<option>"}},
      {{"label": "B", "text": "<option>"}},
      {{"label": "C", "text": "<option>"}},
      {{"label": "D", "text": "<option>"}}
    ],
    "correct_answer": "<A|B|C|D>",
    "marks": 1
  }}
]
"""

SQL_QUERY_PROMPT = """
Generate {count} SQL query writing questions. These are practical SQL problems the candidate must solve.
Use a common schema: employees(id, name, dept_id, salary, hire_date), departments(id, name, manager_id)

Return JSON array:
[
  {{
    "question_text": "<problem statement>",
    "question_type": "sql_write",
    "correct_answer": "<correct SQL query>",
    "marks": 5,
    "table_schema": "<brief schema description>"
  }}
]
"""

CODING_PROMPT = """
Generate {count} coding problems for a software engineering interview.
Use easy to medium difficulty.
All problems must use standard input (stdin) and print to stdout.
No function definitions needed — just read input and print output.

Return JSON array:
[
  {{
    "question_text": "<full problem description with input format and examples>",
    "question_type": "coding",
    "difficulty": "<easy|medium>",
    "options": [
      {{"input": "<stdin value>", "expected_output": "<stdout value>", "is_hidden": false}},
      {{"input": "<stdin value>", "expected_output": "<stdout value>", "is_hidden": true}}
    ],
    "marks": 10
  }}
]
"""


class AssessmentGeneratorAgent:
    def generate_aptitude(self, count: int = 5) -> list:
        return self._generate(APTITUDE_PROMPT.format(count=count))

    def generate_sql_mcq(self, count: int = 5) -> list:
        return self._generate(SQL_MCQ_PROMPT.format(count=count))

    def generate_sql_queries(self, count: int = 2) -> list:
        return self._generate(SQL_QUERY_PROMPT.format(count=count))

    def generate_coding(self, count: int = 2) -> list:
        return self._generate(CODING_PROMPT.format(count=count))

    def _generate(self, prompt: str) -> list:
        try:
            raw = generate_json(prompt)
            result = json.loads(raw)
            return result if isinstance(result, list) else []
        except Exception as e:
            print(f"AssessmentGeneratorAgent error: {e}")
            return []
