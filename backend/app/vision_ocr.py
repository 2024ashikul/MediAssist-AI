import logging
import google.generativeai as genai
from PIL import Image

logger = logging.getLogger("mediassist.vision")

# NOTE: kept identical to the original app.py. If this model name errors out on
# your API key, run backend/check_models.py and swap in a valid model id
# (the project README lists "gemini-2.5-flash" as the intended model).
GEMINI_MODEL_NAME = "gemini-2.5-flash"

_model = None


def get_gemini_model():
    global _model
    if _model is None:
        _model = genai.GenerativeModel(GEMINI_MODEL_NAME)
    return _model


def analyze_symptoms_from_image(image: Image.Image, bangla: bool) -> str:
    try:
        model = get_gemini_model()
        prompt = f"""You are a clinical observer describing ONLY what is physically visible in this image — no interpretation, no diagnosis, no medical advice.

STEP 1 — Verify: Does this image show a visible physical symptom, condition, or body part relevant to a health concern (e.g. rash, swelling, wound, discoloration)?
- If NO (e.g. unrelated photo, object, scenery, no visible symptom): respond with exactly "NOT_A_SYMPTOM_IMAGE" and nothing else.

STEP 2 — If YES, describe in 2-3 short sentences:
- Location on the body (if identifiable)
- Visual characteristics only: color, size, texture, shape, swelling, discharge, etc.
- Do NOT name a condition, disease, or likely cause. Do NOT say things like "this looks like X."

Reply entirely in {'Bengali' if bangla else 'English'}. Do not mix languages."""
        response = model.generate_content([prompt, image])
        text = response.text.strip()
        if text == "NOT_A_SYMPTOM_IMAGE":
            return "ERROR: এই ছবিতে কোনো লক্ষণ শনাক্ত করা যায়নি।" if bangla else "ERROR: No visible symptom detected in this image."
        return text
    except Exception:
        logger.exception("Gemini vision analysis failed")
        return "ERROR: ছবি প্রসেস করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।" if bangla else "ERROR: Failed to process the image. Please try again."


def extract_text_gemini(image: Image.Image, bangla: bool) -> str:
    try:
        model = get_gemini_model()
        prompt = f"""You are transcribing a medical prescription or lab report image. Your ONLY job is to transcribe what is written, not to interpret or advise.

STEP 1 — Verify: Is this image actually a medical prescription, lab report, or medicine packaging?
- If NO (e.g. unrelated photo, blank image, illegible scan): respond with exactly "NOT_A_PRESCRIPTION" and nothing else.

STEP 2 — If YES, transcribe using this exact structure, leaving a field blank if not present:
Medicines:
- [name] — [dosage] — [frequency] — [duration]

Other instructions on document: [transcribe verbatim any advice/instructions written on the document — do not add your own]

Doctor/Clinic name: [if visible]
Date: [if visible]

RULES:
- Transcribe text exactly as written. Do not correct, complete, or guess illegible medicine names — write "[illegible]" instead.
- Explicity try to extract Medicine Brand name. Tab. means tablet, try to know short forms and give exact brand name. Write a constructive markdown for that the report becomes nice
- Do not add any medical advice, warnings, or interpretation of your own.
- Output language: write field labels and any transcribed advice in {'Bengali' if bangla else 'English'}, but keep medicine names in their original script as written on the prescription."""
        response = model.generate_content([prompt, image])
        text = response.text.strip()
        if text == "NOT_A_PRESCRIPTION":
            return "ERROR: এই ছবিতে কোনো প্রেসক্রিপশন বা রিপোর্ট খুঁজে পাওয়া যায়নি।" if bangla else "ERROR: No prescription or lab report detected in this image."
        return text
    except Exception:
        logger.exception("Gemini OCR extraction failed")
        return "ERROR: Gemini OCR ব্যর্থ হয়েছে। আবার চেষ্টা করুন।" if bangla else "ERROR: Gemini OCR failed. Please try again."
