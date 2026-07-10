import json
from app.core.config import settings
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
        return self._generate(APTITUDE_PROMPT.format(count=count), self._default_aptitude(count))

    def generate_sql_mcq(self, count: int = 5) -> list:
        return self._generate(SQL_MCQ_PROMPT.format(count=count), self._default_sql_mcq(count))

    def generate_sql_queries(self, count: int = 2) -> list:
        return self._generate(SQL_QUERY_PROMPT.format(count=count), self._default_sql_queries(count))

    def generate_coding(self, count: int = 2) -> list:
        return self._generate(CODING_PROMPT.format(count=count), self._default_coding(count))

    def _generate(self, prompt: str, fallback: list) -> list:
        if not settings.GEMINI_API_KEY:
            return fallback

        try:
            raw = generate_json(prompt)
            result = json.loads(raw)
            return result if isinstance(result, list) and result else fallback
        except Exception as e:
            print(f"AssessmentGeneratorAgent error: {e}")
            return fallback

    def _default_aptitude(self, count: int) -> list:
        questions = [
            {
                "question_text": "A train travels 180 km in 3 hours. What is its average speed?",
                "question_type": "mcq",
                "options": [
                    {"label": "A", "text": "45 km/h"},
                    {"label": "B", "text": "60 km/h"},
                    {"label": "C", "text": "75 km/h"},
                    {"label": "D", "text": "90 km/h"},
                ],
                "correct_answer": "B",
                "category": "quantitative",
                "marks": 1,
            },
            {
                "question_text": "Find the next number in the series: 2, 6, 12, 20, 30, ?",
                "question_type": "mcq",
                "options": [
                    {"label": "A", "text": "40"},
                    {"label": "B", "text": "42"},
                    {"label": "C", "text": "44"},
                    {"label": "D", "text": "48"},
                ],
                "correct_answer": "B",
                "category": "logical",
                "marks": 1,
            },
            {
                "question_text": "If all Bloops are Razzies and all Razzies are Lazzies, which statement is true?",
                "question_type": "mcq",
                "options": [
                    {"label": "A", "text": "All Bloops are Lazzies"},
                    {"label": "B", "text": "All Lazzies are Bloops"},
                    {"label": "C", "text": "No Bloops are Lazzies"},
                    {"label": "D", "text": "Some Razzies are not Bloops"},
                ],
                "correct_answer": "A",
                "category": "logical",
                "marks": 1,
            },
            {
                "question_text": "Choose the word closest in meaning to 'concise'.",
                "question_type": "mcq",
                "options": [
                    {"label": "A", "text": "Brief"},
                    {"label": "B", "text": "Complex"},
                    {"label": "C", "text": "Careless"},
                    {"label": "D", "text": "Delayed"},
                ],
                "correct_answer": "A",
                "category": "verbal",
                "marks": 1,
            },
            {
                "question_text": "A product is sold for Rs. 120 after a 20% profit. What was its cost price?",
                "question_type": "mcq",
                "options": [
                    {"label": "A", "text": "Rs. 90"},
                    {"label": "B", "text": "Rs. 96"},
                    {"label": "C", "text": "Rs. 100"},
                    {"label": "D", "text": "Rs. 110"},
                ],
                "correct_answer": "C",
                "category": "quantitative",
                "marks": 1,
            },
        ]
        return questions[:count]

    def _default_sql_mcq(self, count: int) -> list:
        questions = [
            {
                "question_text": "Which SQL clause is used to filter rows before grouping?",
                "question_type": "mcq",
                "options": [
                    {"label": "A", "text": "WHERE"},
                    {"label": "B", "text": "HAVING"},
                    {"label": "C", "text": "ORDER BY"},
                    {"label": "D", "text": "GROUP BY"},
                ],
                "correct_answer": "A",
                "marks": 1,
            },
            {
                "question_text": "Which join returns only matching rows from both tables?",
                "question_type": "mcq",
                "options": [
                    {"label": "A", "text": "LEFT JOIN"},
                    {"label": "B", "text": "RIGHT JOIN"},
                    {"label": "C", "text": "INNER JOIN"},
                    {"label": "D", "text": "FULL OUTER JOIN"},
                ],
                "correct_answer": "C",
                "marks": 1,
            },
            {
                "question_text": "Which aggregate function counts rows?",
                "question_type": "mcq",
                "options": [
                    {"label": "A", "text": "SUM()"},
                    {"label": "B", "text": "COUNT()"},
                    {"label": "C", "text": "AVG()"},
                    {"label": "D", "text": "MAX()"},
                ],
                "correct_answer": "B",
                "marks": 1,
            },
            {
                "question_text": "What does a primary key guarantee?",
                "question_type": "mcq",
                "options": [
                    {"label": "A", "text": "Duplicate values are allowed"},
                    {"label": "B", "text": "Values are unique and not null"},
                    {"label": "C", "text": "Rows are always sorted"},
                    {"label": "D", "text": "The column stores dates only"},
                ],
                "correct_answer": "B",
                "marks": 1,
            },
            {
                "question_text": "Which clause filters grouped results?",
                "question_type": "mcq",
                "options": [
                    {"label": "A", "text": "WHERE"},
                    {"label": "B", "text": "HAVING"},
                    {"label": "C", "text": "LIMIT"},
                    {"label": "D", "text": "DISTINCT"},
                ],
                "correct_answer": "B",
                "marks": 1,
            },
        ]
        return questions[:count]

    def _default_sql_queries(self, count: int) -> list:
        questions = [
            {
                "question_text": "Using employees(id, name, dept_id, salary, hire_date) and departments(id, name, manager_id), write a SQL query to list each department name with the number of employees in that department.",
                "question_type": "sql_write",
                "correct_answer": "SELECT d.name, COUNT(e.id) AS employee_count FROM departments d LEFT JOIN employees e ON e.dept_id = d.id GROUP BY d.name;",
                "marks": 5,
                "table_schema": "employees(id, name, dept_id, salary, hire_date), departments(id, name, manager_id)",
            },
            {
                "question_text": "Using employees(id, name, dept_id, salary, hire_date), write a SQL query to find the second highest salary.",
                "question_type": "sql_write",
                "correct_answer": "SELECT MAX(salary) AS second_highest_salary FROM employees WHERE salary < (SELECT MAX(salary) FROM employees);",
                "marks": 5,
                "table_schema": "employees(id, name, dept_id, salary, hire_date)",
            },
        ]
        return questions[:count]

    def _default_coding(self, count: int) -> list:
        questions = [
            {
                "question_text": "Two Sum\n\nGiven n integers and a target value, print two zero-based indices whose values add up to the target. Input format: first line n, second line n space-separated integers, third line target. If no pair exists, print -1.\n\nExample:\nInput:\n5\n2 7 11 15 3\n10\nOutput:\n1 4",
                "question_type": "coding",
                "difficulty": "easy",
                "options": [
                    {"input": "5\n2 7 11 15 3\n10", "expected_output": "1 4", "is_hidden": False},
                    {"input": "4\n1 2 3 4\n8", "expected_output": "-1", "is_hidden": True},
                ],
                "marks": 10,
            },
            {
                "question_text": "Valid Parentheses\n\nGiven a string containing only (), {}, and [], print YES if brackets are balanced, otherwise print NO.\n\nExample:\nInput:\n{[()]}\nOutput:\nYES",
                "question_type": "coding",
                "difficulty": "easy",
                "options": [
                    {"input": "{[()]}", "expected_output": "YES", "is_hidden": False},
                    {"input": "([)]", "expected_output": "NO", "is_hidden": True},
                ],
                "marks": 10,
            },
        ]
        return questions[:count]
