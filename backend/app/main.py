import io
import logging
from contextlib import asynccontextmanager
from fastapi import HTTPException, Body
from dotenv import load_dotenv
load_dotenv()
from .get_medicine_data import search_brand,get_brand_by_id
import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import google.generativeai as genai
from groq import Groq
from fastapi.concurrency import run_in_threadpool

from app.models import (
    ChatRequest, ChatResponse, TriageSubmitRequest, TriageSubmitResponse,
    ImageAnalysisResponse, TranscribeResponse, HealthResponse,MedicineDetail,
    MedicineSearchResponse,
    MedicineSearchResult, AIOverviewRequest
)
from app.rag_pipeline import RagPipeline
from app.utils import is_symptom_query, append_context, build_triage_answers_block, generate_triage_questions,generate_medicine_overview
from app.vision_ocr import analyze_symptoms_from_image, extract_text_gemini

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("mediassist.main")

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
CHROMA_PATH = os.environ.get("CHROMA_PATH", "./chroma_db")
FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173")

state = {"rag": None, "groq_client": None}


@asynccontextmanager
async def lifespan(app: FastAPI):
    if GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)
    else:
        logger.warning("GEMINI_API_KEY not set — vision/OCR endpoints will fail.")

    if GROQ_API_KEY:
        state["groq_client"] = Groq(api_key=GROQ_API_KEY)
    else:
        logger.warning("GROQ_API_KEY not set — chat/triage/voice endpoints will fail.")

    if GROQ_API_KEY:
        try:
            state["rag"] = RagPipeline(groq_api_key=GROQ_API_KEY, chroma_path=CHROMA_PATH)
            logger.info("RAG pipeline loaded successfully.")
        except Exception:
            logger.exception("Failed to load RAG pipeline. /api/chat will fail until this is fixed.")
            state["rag"] = None

    yield
    state.clear()


app = FastAPI(title="MediAssist AI API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    FRONTEND_ORIGIN,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://192.168.0.107:5173",
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _require_rag() -> RagPipeline:
    if state["rag"] is None:
        raise HTTPException(
            status_code=503,
            detail="RAG pipeline is not ready. Check that GROQ_API_KEY is set and chroma_db exists.",
        )
    return state["rag"]


def _require_groq() -> Groq:
    if state["groq_client"] is None:
        raise HTTPException(status_code=503, detail="GROQ_API_KEY is not configured on the server.")
    return state["groq_client"]


def _require_gemini():
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY is not configured on the server.")


async def _read_image(file: UploadFile) -> Image.Image:
    raw = await file.read()
    try:
        return Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image.")


@app.get("/")
def root():
    return {"message": "Hello, welcome !  The server is running."}


# ─── Health ─────────────────────────────────────────────────────────
@app.get("/api/health", response_model=HealthResponse)
def health():
    return HealthResponse(
        status="ok",
        rag_ready=state["rag"] is not None,
        groq_configured=bool(GROQ_API_KEY),
        gemini_configured=bool(GEMINI_API_KEY),
    )


# ─── Chat ───────────────────────────────────────────────────────────
@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    rag = _require_rag()

    if is_symptom_query(req.message):
        groq_client = _require_groq()
        questions = await generate_triage_questions(req.message, groq_client)
        if questions:
            return ChatResponse(
                type="triage",
                triage_questions=questions,
                original_input=req.message,
            )

    combined = append_context(req.message, req.ocr_context, req.vision_context)
    answer = rag.run(combined, req.chat_history)
    return ChatResponse(type="answer", answer=answer, enriched_input=combined)


@app.post("/api/chat/triage-submit", response_model=TriageSubmitResponse)
async def triage_submit(req: TriageSubmitRequest):
    rag = _require_rag()

    enriched = req.original_input
    if not req.skipped and req.answers:
        questions_as_dicts = [q.model_dump() for q in req.questions]
        enriched += build_triage_answers_block(questions_as_dicts, req.answers)

    enriched = append_context(enriched, req.ocr_context, req.vision_context)
    answer = rag.run(enriched, req.chat_history)
    return TriageSubmitResponse(answer=answer, enriched_input=enriched)


# ─── Vision symptom checker ─────────────────────────────────────────
@app.post("/api/vision/analyze", response_model=ImageAnalysisResponse)
async def vision_analyze(file: UploadFile = File(...), language: str = Form("bn")):
    _require_gemini()
    image = await _read_image(file)
    result = analyze_symptoms_from_image(image, bangla=(language == "bn"))
    return ImageAnalysisResponse(result=result, is_error=result.startswith("ERROR"))


# ─── Prescription / report OCR ──────────────────────────────────────
@app.post("/api/ocr/extract", response_model=ImageAnalysisResponse)
async def ocr_extract(file: UploadFile = File(...), language: str = Form("bn")):
    _require_gemini()
    image = await _read_image(file)
    result = extract_text_gemini(image, bangla=(language == "bn"))
    return ImageAnalysisResponse(result=result, is_error=result.startswith("ERROR"))


# ─── Voice transcription (Groq Whisper) ─────────────────────────────
@app.post("/api/voice/transcribe", response_model=TranscribeResponse)
async def voice_transcribe(file: UploadFile = File(...), language: str = Form("bn")):
    groq_client = _require_groq()
    raw = await file.read()
    audio_file = io.BytesIO(raw)
    audio_file.name = "recording.wav"

    lang_cfg = {
        "bn": {"whisper_lang": "bn", "voice_prompt": "এটি একটি চিকিৎসা সংক্রান্ত কথোপকথন।"},
        "en": {"whisper_lang": "en", "voice_prompt": "This is a medical conversation."},
    }[language if language in ("bn", "en") else "bn"]

    try:
        transcription = groq_client.audio.transcriptions.create(
            file=audio_file,
            model="whisper-large-v3-turbo",
            language=lang_cfg["whisper_lang"],
            prompt=lang_cfg["voice_prompt"],
        )
        return TranscribeResponse(text=transcription.text)
    except Exception as e:
        logger.exception("Voice transcription failed")
        raise HTTPException(status_code=500, detail=f"Voice processing failed: {e}")

# --- Search for medicine -------#
@app.get('/api/search',response_model=MedicineSearchResponse)
async def search(q:str):
    results = search_brand(q)
    print(results)
    return MedicineSearchResponse(
        query  = q,
        count = len(results),
        results = results
    )

# --- Get specific medicine information -------#
@app.get('/api/medicine/{brand_id}', response_model=MedicineDetail)
async def medicine_detail(brand_id: int):
    result = get_brand_by_id(brand_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return result

@app.post('/api/medicine/ai_overview', response_model= str)
async def medicine_ai_review(payload:AIOverviewRequest):
    medicine: MedicineDetail = await medicine_detail(payload.brand_id)
    language : str = payload.language

    print(payload)
    field_labels = {
        "brand_name": "Brand Name",
        "generic_name": "Generic Name",
        "strength": "Strength",
        "dosage_form": "Dosage Form",
        "manufacturer": "Manufacturer",
        "type": "Type",
        "indication_description": "Indication",
        "pharmacology_description": "Pharmacology",
        "dosage_description": "Dosage",
        "administration_description": "Administration",
        "interaction_description": "Interaction",
        "contraindications_description": "Contraindications",
        "side_effects_description": "Side Effects",
        "pregnancy_and_lactation_description": "Pregnancy and Lactation",
        "precautions_description": "Precautions",
        "pediatric_usage_description": "Pediatric Usage",
        "overdose_effects_description": "Overdose Effects",
        "duration_of_treatment_description": "Duration of Treatment",
        "reconstitution_description": "Reconstitution",
        "storage_conditions_description": "Storage Conditions",
    }

    parts = []
    for field, label in field_labels.items():
        value = getattr(medicine, field, None)
        if value:
            parts.append(f"{label}: {value}")

    medicine_info = "\n".join(parts)

    if not medicine_info.strip():
        raise HTTPException(status_code=422, detail="No medicine information available to summarize")
    print(language)
    groq_client = _require_groq()
    overview = await generate_medicine_overview(medicine_info, groq_client,language
    )

    return overview

