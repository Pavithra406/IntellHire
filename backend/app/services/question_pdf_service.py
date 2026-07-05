"""
Parses question PDFs uploaded by HR.

Expected PDF formats:

APTITUDE / SQL MCQ:
-------------------
1. What is the output of 2+2?
A) 3
B) 4
C) 5
D) 6
Answer: B

SQL QUERY:
----------
1. Write a query to get all employees with salary > 50000.
Answer: SELECT * FROM employees WHERE salary > 50000;

CODING:
-------
1. Write a function to reverse a string.
Input: "hello"
Output: "olleh"
Answer:
def reverse(s):
    return s[::-1]
"""

import re
import io
import pdfplumber
from typing import List, Dict


def extract_pdf_text(file_bytes: bytes) -> str:
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        text = ""
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                text += t + "\n"
    return text.strip()


def parse_mcq_questions(text: str) -> List[Dict]:
    """Parse MCQ questions with A/B/C/D options and Answer line."""
    questions = []
    # Split by question numbers like "1." "2." etc
    blocks = re.split(r'\n(?=\d+[\.\)]\s)', text.strip())

    for block in blocks:
        block = block.strip()
        if not block:
            continue

        lines = [l.strip() for l in block.split('\n') if l.strip()]
        if len(lines) < 3:
            continue

        # First line is question text (strip leading number)
        q_text = re.sub(r'^\d+[\.\)]\s*', '', lines[0]).strip()
        if not q_text:
            continue

        options = []
        correct_answer = None

        for line in lines[1:]:
            # Match options: A) or A. or (A)
            opt_match = re.match(r'^([A-Da-d])[\.|\)|\s]\s*(.+)', line)
            if opt_match:
                label = opt_match.group(1).upper()
                text_val = opt_match.group(2).strip()
                options.append({"label": label, "text": text_val})
            # Match answer line
            ans_match = re.match(r'^[Aa]nswer\s*[:=]\s*([A-Da-d])', line)
            if ans_match:
                correct_answer = ans_match.group(1).upper()

        if q_text and len(options) >= 2:
            questions.append({
                "question_text": q_text,
                "question_type": "mcq",
                "options": options,
                "correct_answer": correct_answer or "A",
                "marks": 1.0
            })

    return questions


def parse_sql_query_questions(text: str) -> List[Dict]:
    """Parse SQL query writing questions."""
    questions = []
    blocks = re.split(r'\n(?=\d+[\.\)]\s)', text.strip())

    for block in blocks:
        block = block.strip()
        if not block:
            continue

        lines = [l.strip() for l in block.split('\n') if l.strip()]
        if not lines:
            continue

        q_text = re.sub(r'^\d+[\.\)]\s*', '', lines[0]).strip()
        correct_answer = ""

        # Find answer after "Answer:" line
        answer_start = False
        answer_lines = []
        for line in lines[1:]:
            if re.match(r'^[Aa]nswer\s*[:=]?\s*', line):
                answer_start = True
                # Inline answer on same line
                inline = re.sub(r'^[Aa]nswer\s*[:=]?\s*', '', line).strip()
                if inline:
                    answer_lines.append(inline)
            elif answer_start:
                answer_lines.append(line)

        correct_answer = " ".join(answer_lines).strip()

        if q_text:
            questions.append({
                "question_text": q_text,
                "question_type": "sql_write",
                "options": None,
                "correct_answer": correct_answer,
                "marks": 5.0
            })

    return questions


def parse_coding_questions(text: str) -> List[Dict]:
    """Parse coding questions with visible and hidden test cases."""
    questions = []
    blocks = re.split(r'\n(?=\d+[\.\)]\s)', text.strip())

    for block in blocks:
        block = block.strip()
        if not block:
            continue

        lines = [l.strip() for l in block.split('\n') if l.strip()]
        if not lines:
            continue

        q_text = re.sub(r'^\d+[\.\)]\s*', '', lines[0]).strip()
        full_q_lines = [q_text]
        answer_lines = []
        section = "question"

        visible_input = ""
        visible_output = ""
        hidden_inputs = []
        hidden_outputs = []
        current_hidden_input = None

        for line in lines[1:]:
            low = line.lower()

            if re.match(r'^hidden\s+input\s*:', line, re.IGNORECASE):
                val = re.sub(r'^hidden\s+input\s*:\s*', '', line, flags=re.IGNORECASE).strip()
                current_hidden_input = val
                section = "hidden_input"
            elif re.match(r'^hidden\s+output\s*:', line, re.IGNORECASE):
                val = re.sub(r'^hidden\s+output\s*:\s*', '', line, flags=re.IGNORECASE).strip()
                hidden_inputs.append(current_hidden_input or "")
                hidden_outputs.append(val)
                current_hidden_input = None
                section = "hidden_output"
            elif re.match(r'^input\s*:', line, re.IGNORECASE):
                visible_input = re.sub(r'^input\s*:\s*', '', line, flags=re.IGNORECASE).strip()
                section = "input"
            elif re.match(r'^(expected\s+)?output\s*:', line, re.IGNORECASE):
                visible_output = re.sub(r'^(expected\s+)?output\s*:\s*', '', line, flags=re.IGNORECASE).strip()
                section = "output"
            elif re.match(r'^(answer|solution)\s*:?', line, re.IGNORECASE):
                section = "answer"
                inline = re.sub(r'^(answer|solution)\s*:?\s*', '', line, flags=re.IGNORECASE).strip()
                if inline:
                    answer_lines.append(inline)
            elif section == "question":
                full_q_lines.append(line)
            elif section == "answer":
                answer_lines.append(line)

        full_question = "\n".join(full_q_lines).strip()
        correct_answer = "\n".join(answer_lines).strip()

        # Build test cases
        test_cases = []
        if visible_input or visible_output:
            test_cases.append({
                "input": visible_input,
                "expected_output": visible_output,
                "is_hidden": False
            })
        for hi, ho in zip(hidden_inputs, hidden_outputs):
            test_cases.append({
                "input": hi,
                "expected_output": ho,
                "is_hidden": True
            })

        if full_question:
            questions.append({
                "question_text": full_question,
                "question_type": "coding",
                "options": test_cases if test_cases else None,
                "correct_answer": correct_answer,
                "marks": 10.0
            })

    return questions


def parse_questions_from_pdf(file_bytes: bytes, assessment_type: str, sub_type: str = "mcq") -> List[Dict]:
    """
    Main entry point.
    assessment_type: aptitude | sql | coding
    sub_type: mcq | query (for sql)
    """
    text = extract_pdf_text(file_bytes)
    if not text:
        return []

    if assessment_type == "aptitude":
        return parse_mcq_questions(text)
    elif assessment_type == "sql":
        if sub_type == "query":
            return parse_sql_query_questions(text)
        return parse_mcq_questions(text)
    elif assessment_type == "coding":
        return parse_coding_questions(text)
    return []
