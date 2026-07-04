import json
import logging
from typing import List, Optional

logger = logging.getLogger("mediassist.utils")

SYMPTOM_KEYWORDS = [
    "ব্যথা", "বেথা", "বেদনা", "কামড়ানি", "কামড়ানো", "চাবানি", "পিনপিন", "ঝিনঝিন", "অবশ", "জ্বলন", "পোড়া", "অনূভুতি",
    "জ্বর", "কাশি", "কাশিঁ", "কফ", "শ্লেষ্মা", "শ্বাস", "হাঁপানী", "হাঁচি", "সর্দি", "শর্দি", "নাক", "গলা", "টনসিল", "কান", "চোখ", "কণ্ঠ",
    "বমি", "বমিবমি", "পেট", "গ্যাস্ট্রিক", "গ্যাস", "অম্বল", "বুকজ্বালা", "বদহজম", "ডায়রিয়া", "পাতলা", "পায়খানা", "কোষ্ঠকাঠিন্য", "খাবার", "খিদে", "ক্ষুধা",
    "মাথা", "ঘোরা", "চক্কর", "দুর্বল", "ক্লান্ত", "অবসাদ", "ঘুম", "অনিদ্রা", "কাঁপনি", "কম্পন", "খিঁচুনি",
    "র্যাশ", "চুলকানি", "ফোলা", "ঘা", "পাচড়া", "বিচি", "ফুসকুড়ি", "পাকা", "রস",
    "বুক", "পিঠ", "কোমর", "ঘাড়", "হাত", "পা", "হাঁটু", "গিঁঠ", "জয়েন্ট", "মাংসপেশি", "দাঁত",
    "রক্ত", "রক্তপাত", "পুঁজ", "প্রস্রাব", "পিশাব", "পায়খানা",
    "betha", "byatha", "batha", "bedona", "kamrani", "chabani", "jhinjhin", "obosh", "jdirty", "jlapora", "puda",
    "jor", "jwor", "zhor", "kashi", "khansi", "kof", "shash", "shashkosto", "haphani", "hachi", "shordi", "sordi", "gola", "tonsil", "nak", "kan", "chokh",
    "bomi", "vomit", "pet", "pete", "pate", "gastric", "gas", "ombol", "bukjola", "bodhojom", "diarrhea", "patla", "paykhana", "koshthokathinno", "khide", "khuda",
    "matha", "mathay", "ghora", "chokkor", "durbol", "durbolta", "klanto", "ghum", "onidra", "khichuni", "kapuni",
    "rash", "cholkani", "chulkani", "fola", "gha", "fuskuri",
    "buk", "buke", "pith", "komor", "koomor", "ghar", "hat", "pa", "bahu", "hatu", "gith", "joint", "mangsopeshi", "dat", "dath",
    "rokto", "roghth", "puj", "proshrab", "pishab", "poshab",
    "pain", "ache", "hurt", "sore", "throbbing", "burning", "stinging", "cramp", "spasm", "discomfort", "suffering", "feeling",
    "fever", "chills", "shivering", "sweating", "fatigue", "tired", "weak", "weakness", "lethargy", "dizzy", "dizziness", "giddiness", "lightheaded", "faint",
    "cough", "coughing", "mucus", "phlegm", "sputum", "breathing", "breathless", "wheezing", "asthma", "sneezing", "congestion", "throat", "hoarse", "ear", "earache", "eye", "vision", "nose", "bleeding",
    "chest", "heart", "palpitation", "tightness", "pressure",
    "nausea", "vomit", "vomiting", "diarrhea", "loose", "stool", "constipation", "stomach", "abdomen", "abdominal", "belly", "gastric", "acidity", "heartburn", "bloating", "indigestion", "appetite", "nauseous",
    "back", "backache", "lumbar", "neck", "joint", "muscle", "swelling", "swollen", "inflammation", "rash", "itching", "itchy", "allergy", "allergic", "lesion", "ulcer", "blister"
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


async def generate_triage_questions(symptom_text: str, groq_client) -> list:
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

async def generate_medicine_overview(medicine_info: str, groq_client,language : str) -> str: 
    try:
        prompt = f"""This is the medicine info of a medicine: "{medicine_info}"
        Please simplify this information for a general audience. Include:
        - A short overview and what reasons the medicine is used for.
        - How they should take it (including weight/age instructions if present).
        - Any side effects.
        -Generate a simple, easy-to-read text response in markdown.
        reply in {language}
        --max_tokens 2000 so reply within that
        """
        
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=2000,
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        print(e)
        return f"An error occurred while generating the overview"