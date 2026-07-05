"""
Parses Answer Key PDFs uploaded by HR.

Supported formats:

MCQ Answer Key:
---------------
1. B
2. C
3. A
4. D

OR:

1. Answer: B
2. Answer: C

SQL/Coding Answer Key:
-----------------------
1. SELECT * FROM employees WHERE salary > 50000;

2.
def reverse(s):
    return s[::-1]
"""

import re
import io
import pdfplumber
from typing import Dict, List


def extract_pdf_text(file_bytes: bytes) -> str:
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        text = ""
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                text += t + "\n"
    return text.strip()


def parse_mcq_answer_key(text: str) -> Dict[int, str]:
    """
    Returns {question_number: correct_option}
    e.g. {1: 'B', 2: 'C', 3: 'A'}
    """
    answers = {}
    lines = [l.strip() for l in text.split('\n') if l.strip()]

    for line in lines:
        # Pattern: "1. B" or "1) B" or "1. Answer: B" or "Q1: B"
        m = re.match(
            r'^[Qq]?(\d+)[\.|\)|\s:]+(?:[Aa]nswer\s*[:=]\s*)?([A-Da-d])\b',
            line
        )
        if m:
            qnum = int(m.group(1))
            ans = m.group(2).upper()
            answers[qnum] = ans

    return answers


def parse_text_answer_key(text: str) -> Dict[int, str]:
    """
    Returns {question_number: answer_text} for SQL/Coding answers.
    """
    answers = {}
    # Split by question numbers
    blocks = re.split(r'\n(?=\d+[\.\)]\s)', text.strip())

    for block in blocks:
        block = block.strip()
        if not block:
            continue
        lines = [l.strip() for l in block.split('\n') if l.strip()]
        if not lines:
            continue

        # Get question number from first line
        m = re.match(r'^(\d+)[\.\)]\s*(.*)', lines[0])
        if not m:
            continue

        qnum = int(m.group(1))
        inline = m.group(2).strip()

        # Rest of lines are the answer body
        answer_lines = []
        if inline:
            answer_lines.append(inline)
        for line in lines[1:]:
            # Skip "Answer:" prefix if present
            cleaned = re.sub(r'^[Aa]nswer\s*[:=]\s*', '', line).strip()
            answer_lines.append(cleaned)

        answers[qnum] = "\n".join(answer_lines).strip()

    return answers
