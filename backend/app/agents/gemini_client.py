import warnings
warnings.filterwarnings("ignore", category=FutureWarning)

import google.generativeai as genai
from app.core.config import settings

_configured = False
MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-2.5-flash"]


def _ensure_configured():
    global _configured
    if not _configured:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _configured = True


def _call_with_fallback(prompt: str) -> str:
    _ensure_configured()
    last_err = None
    for model_name in MODELS:
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            last_err = e
            continue
    raise last_err


def generate_text(prompt: str) -> str:
    return _call_with_fallback(prompt)


def generate_json(prompt: str) -> str:
    full_prompt = prompt + "\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no code fences, no explanation."
    text = _call_with_fallback(full_prompt).strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1]).strip()
    return text
