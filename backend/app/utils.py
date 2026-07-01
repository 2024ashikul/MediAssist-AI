import json
import logging
from typing import List, Optional

logger = logging.getLogger("mediassist.utils")

SYMPTOM_KEYWORDS = [
    "ব্যথা", "বেথা", "জ্বর", "কাশি", "শ্বাস", "বমি", "মাথা", "বুক", "পেট", "গলা", "চোখ", "কান", "নাক",
    "হাত", "পা", "দুর্বল", "ক্লান্ত", "ঘুম", "খিদে", "র্যাশ", "চুলকানি", "ফোলা", "রক্ত", "ডায়রিয়া",
    "betha", "jor", "jore", "bugti", "kashi", "shash", "bomi", "matha", "buk", "pet", "gola",
    "chokh", "kan", "nak", "durbolta", "ghum", "khide", "rash", "cholkani", "fola", "shordi", "khansi",
    "mathay", "pate", "buke",
    "pain", "fever", "cough", "headache", "nausea", "vomit", "dizzy", "tired", "weak", "swelling",
    "bleeding", "diarrhea", "chest", "stomach", "throat", "eye", "ear", "breathing", "itching",
    "burning", "ache", "sore", "hurt", "suffering", "feeling",
]


def is_symptom_query(text: str) -> bool:
    return any(k in text.lower() for k in SYMPTOM_KEYWORDS)


def append_context(base: str, ocr_context: Optional[str], vision_context: Optional[str]) -> str:
    if ocr_context:
        base += f"\n\n[OCR Prescription]:\n{ocr_context}"
    if vision_context and not vision_context.startswith("ERROR"):
        base += f"\n\n[Visual Symptoms]:\n{vision_context}"
    return base


def build_triage_answers_block(questions: List[dict], answers: dict) -> str:
    lines = ["\n\n[Patient answers]:"]
    for q in questions:
        ans = answers.get(str(q["id"]), "N/A")
        lines.append(f"- {q['question']}: {ans}")
    return "\n".join(lines)


def generate_triage_questions(symptom_text: str, groq_client) -> list:
    """Mirrors the triage-question generator from the original Streamlit app."""
    try:
        prompt = f"""Patient said: "{symptom_text}"

You are a clinical triage assistant generating structured follow-up questions — NOT generic open-ended ones like "what is the reason" or "tell me more."

Generate exactly 3-5 MCQ questions, each with 4 options, prioritizing the most clinically useful categories that fit this symptom:
1. Duration/onset (e.g. "How long have you had this?")
2. Severity (e.g. mild/moderate/severe or a 1-10 style scale as options)
3. Associated symptoms (what else is present alongside the main complaint)
4. Aggravating/relieving factors (what makes it better or worse)
5. Red flag check (something that would indicate urgency, if relevant to this symptom)

Each question must be answerable by someone with no medical background, and each option must be a concrete, specific choice — not vague ranges like "a little" or "a lot."

STRICT RULE:
- Bengali script or Banglish input → questions and options in Bengali script ONLY.
- English input → English ONLY.
- Never mix languages.

Return ONLY valid JSON, no markdown, no preamble.
Format: {{"questions":[{{"id":1,"question":"...","options":["A","B","C","D"]}}]}}"""

        raw = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1000,
        ).choices[0].message.content.strip()

        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw.strip()).get("questions", [])
    except Exception:
        logger.exception("Triage question generation failed")
        return []
